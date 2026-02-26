"""
PostgreSQL + pgvector RAG Module for CandidAI

Provides semantic search over interview questions using pgvector and
fastembed for embeddings. Handles both ingestion and retrieval.

Features:
- Async postgres connection pool with pgvector type registered
- Heading-based markdown chunking
- fastembed (BAAI/bge-small-en-v1.5) embeddings
- Vector similarity search via pgvector
"""

import logging
import os
from pathlib import Path
from typing import Optional

import asyncpg
import numpy as np
from fastembed import TextEmbedding
from pgvector.asyncpg import register_vector

logger = logging.getLogger(__name__)


class PgRag:
    """PostgreSQL + pgvector RAG store."""

    def __init__(
        self,
        database_url: str,
        questions_dir: Path,
        embed_model: str = "BAAI/bge-small-en-v1.5",
        pool_size: int = 10,
    ):
        self._database_url = database_url
        self._questions_dir = Path(questions_dir)
        self._pool_size = pool_size
        self._pool: Optional[asyncpg.Pool] = None
        self._embed_model = TextEmbedding(model_name=embed_model)

    async def start(self) -> None:
        """Initialize database connection, create schema, ingest if empty."""
        if not self._database_url:
            raise ValueError("DATABASE_URL not set")

        # Create pgvector extension FIRST (before pool registers vector type)
        raw_conn = await asyncpg.connect(self._database_url)
        try:
            await raw_conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        finally:
            await raw_conn.close()

        # Now create pool — register_vector will work since extension exists
        async def _init_connection(conn: asyncpg.Connection) -> None:
            await register_vector(conn)

        self._pool = await asyncpg.create_pool(
            self._database_url,
            min_size=2,
            max_size=self._pool_size,
            command_timeout=60,
            init=_init_connection,
        )
        logger.info("PostgreSQL connection pool created")

        # Create table (no index yet — need data first)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS interview_chunks (
                    id SERIAL PRIMARY KEY,
                    source TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(384) NOT NULL
                );
                """
            )

        # Check if table is empty
        async with self._pool.acquire() as conn:
            count = await conn.fetchval("SELECT COUNT(*) FROM interview_chunks;")

        force_reindex = os.getenv("CANDIDAI_RAG_FORCE_REINDEX", "0").lower() in {
            "1",
            "true",
            "yes",
        }

        if count == 0 or force_reindex:
            if force_reindex and count > 0:
                logger.info("Force reindex enabled, clearing existing chunks...")
                async with self._pool.acquire() as conn:
                    await conn.execute("TRUNCATE TABLE interview_chunks;")
                    await conn.execute(
                        "DROP INDEX IF EXISTS idx_chunks_embedding;"
                    )

            await self._ingest()

            # Create IVFFlat index AFTER data is ingested so centroids can be built
            await self._ensure_index()
        else:
            logger.info("RAG ready, %d chunks indexed", count)

    async def _ensure_index(self) -> None:
        """Create the IVFFlat index if enough rows exist, otherwise use HNSW."""
        async with self._pool.acquire() as conn:
            count = await conn.fetchval("SELECT COUNT(*) FROM interview_chunks;")
            if count == 0:
                return

            # Check if index already exists
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chunks_embedding';"
            )
            if exists:
                return

            # Use lists = max(1, rows / 10), capped at 100 for small datasets
            lists = max(1, min(count // 10, 100))
            logger.info(
                "Creating IVFFlat index with lists=%d for %d chunks", lists, count
            )
            await conn.execute(
                f"""
                CREATE INDEX idx_chunks_embedding
                    ON interview_chunks USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists={lists});
                """
            )

    async def close(self) -> None:
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            logger.info("PostgreSQL connection pool closed")

    async def search(self, query: str, top_k: int = 8) -> str:
        """Search the RAG store for relevant chunks."""
        if not self._pool:
            raise RuntimeError("RAG not started")

        if not query or not query.strip():
            return "No results found."

        try:
            # query_embed returns a generator — materialize it
            query_vec = list(self._embed_model.query_embed(query))[0]

            async with self._pool.acquire() as conn:
                results = await conn.fetch(
                    """
                    SELECT source, content, embedding <=> $1 as distance
                    FROM interview_chunks
                    ORDER BY embedding <=> $1
                    LIMIT $2;
                    """,
                    query_vec,
                    top_k,
                )

            if not results:
                return "No results found."

            output = []
            for row in results:
                output.append(f"From: {row['source']}")
                output.append(row["content"])
                output.append("")
            return "\n".join(output)

        except Exception as e:
            logger.exception("RAG search failed")
            return "Search failed, please try again."

    async def _ingest(self) -> None:
        """Ingest markdown files from interview_questions directory."""
        if not self._pool:
            raise RuntimeError("RAG not started")

        logger.info("RAG ingesting from %s...", self._questions_dir)

        chunks: list[dict] = []
        file_count = 0

        for md_file in self._questions_dir.rglob("*.md"):
            file_count += 1
            try:
                text = md_file.read_text(encoding="utf-8")
                rel_path = md_file.relative_to(self._questions_dir)
                file_chunks = self._chunk_markdown(text, str(rel_path))
                chunks.extend(file_chunks)
            except Exception as e:
                logger.exception("Failed to ingest %s", md_file)

        if not chunks:
            logger.warning("No markdown chunks found in %s", self._questions_dir)
            return

        logger.info(
            "RAG ingesting %d files... chunked into %d total chunks",
            file_count,
            len(chunks),
        )

        # Generate embeddings — passage_embed also returns a generator
        texts = [chunk["content"] for chunk in chunks]
        embeddings_list = list(self._embed_model.passage_embed(texts))

        # Bulk insert using copy (much faster than individual inserts)
        records = [
            (chunk["source"], chunk["content"], np.array(emb))
            for chunk, emb in zip(chunks, embeddings_list)
        ]

        async with self._pool.acquire() as conn:
            await conn.copy_records_to_table(
                "interview_chunks",
                records=records,
                columns=["source", "content", "embedding"],
            )

        logger.info("RAG ready, %d chunks indexed", len(records))

    def _chunk_markdown(self, text: str, source: str) -> list[dict]:
        """Chunk markdown by headings (## or ###), max ~1500 chars per chunk."""
        chunks: list[dict] = []
        lines = text.split("\n")
        current_chunk: list[str] = []
        current_heading = ""

        for line in lines:
            if line.startswith("##"):
                if current_chunk:
                    content = "\n".join(current_chunk).strip()
                    if content:
                        chunks.append(
                            {
                                "source": f"{source}#{current_heading}",
                                "content": content,
                            }
                        )
                    current_chunk = []

                current_heading = line.lstrip("#").strip()
                current_chunk = [line]
            else:
                current_chunk.append(line)

                content_so_far = "\n".join(current_chunk)
                if len(content_so_far) > 1500:
                    if "\n\n" in content_so_far:
                        parts = content_so_far.rsplit("\n\n", 1)
                        if len(parts[0]) > 500:
                            chunks.append(
                                {
                                    "source": f"{source}#{current_heading}",
                                    "content": parts[0].strip(),
                                }
                            )
                            current_chunk = parts[1].split("\n")

        if current_chunk:
            content = "\n".join(current_chunk).strip()
            if content and len(content) > 50:
                chunks.append(
                    {
                        "source": f"{source}#{current_heading}",
                        "content": content,
                    }
                )

        return chunks
