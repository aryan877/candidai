# Technical Interview Questions

Adapt difficulty based on the candidate's stated experience level.

## Data Structures & Algorithms

1. **Explain the difference between a hash map and a balanced binary search tree. When would you choose one over the other?**
   - Expected: O(1) avg vs O(log n), hash collisions, ordering guarantees, memory usage tradeoffs.
   - Follow-up: "How would you handle hash collisions in a hash map you implemented yourself?"

2. **You have an array of integers and need to find two numbers that sum to a target. Walk me through different approaches and their tradeoffs.**
   - Expected: brute force O(n^2), hash set O(n) time O(n) space, sorted + two pointers O(n log n).
   - Follow-up: "What if the array is already sorted? What if we need all pairs, not just one?"

3. **Explain how you would detect a cycle in a linked list. Why does your approach work?**
   - Expected: Floyd's tortoise and hare algorithm, explanation of why fast/slow pointers converge.
   - Follow-up: "How would you find the start of the cycle?"

## System Design

4. **Design a URL shortening service like bit.ly. What are the key components?**
   - Expected: hash/encoding strategy, database choice, redirect flow, analytics, scaling considerations.
   - Follow-up: "How would you handle 10 billion URLs? What about custom short URLs?"

5. **How would you design a real-time chat application? Walk me through the architecture.**
   - Expected: WebSockets vs polling, message queue, storage, presence, delivery guarantees.
   - Follow-up: "How would you handle offline messages? What about group chats with 1000 members?"

6. **Explain the CAP theorem and give a real-world example of each tradeoff.**
   - Expected: Consistency, Availability, Partition tolerance. Examples like DynamoDB (AP), traditional RDBMS (CP).
   - Follow-up: "Which tradeoff would you choose for a banking system? For a social media feed?"

## Language & Framework Knowledge

7. **Explain closures and give a practical example of when they're useful.**
   - Expected: function capturing variables from outer scope, practical uses like callbacks, data privacy, partial application.
   - Follow-up: "What are potential pitfalls of closures? Can they cause memory leaks?"

8. **What happens when you type a URL into your browser and press Enter? Walk through the entire process.**
   - Expected: DNS resolution, TCP handshake, TLS, HTTP request, server processing, rendering pipeline.
   - Follow-up: "Where would you optimize if the page is loading slowly?"

## Concurrency & Performance

9. **Explain the difference between concurrency and parallelism. Give an example of each.**
   - Expected: concurrency = managing multiple tasks (may interleave), parallelism = executing simultaneously (requires multiple cores).
   - Follow-up: "What are common pitfalls when writing concurrent code?"

10. **How would you optimize a web application that's responding slowly? Walk me through your debugging process.**
    - Expected: profiling, identifying bottlenecks (DB, network, CPU), caching strategies, query optimization, CDN, lazy loading.
    - Follow-up: "How would you set up monitoring to catch performance regressions before users notice?"
