# Coding Challenges

Select difficulty based on the candidate's performance in previous phases.

---

## Challenge 1: Two Sum (Easy)

**Title:** Two Sum

**Description:**
Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume each input has exactly one solution, and you may not use the same element twice. Return the answer in any order.

**Examples:**
- Input: nums = [2, 7, 11, 15], target = 9 -> Output: [0, 1]
- Input: nums = [3, 2, 4], target = 6 -> Output: [1, 2]

**Language:** python

**Starter Code:**
```python
def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    pass
```

**Evaluation Criteria:**
- Optimal: O(n) with hash map. Good: O(n log n) with sorting. Acceptable: O(n^2) brute force with explanation of tradeoffs.

---

## Challenge 2: Valid Parentheses (Easy-Medium)

**Title:** Valid Parentheses

**Description:**
Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. An input string is valid if: open brackets are closed by the same type, open brackets are closed in the correct order, and every close bracket has a corresponding open bracket.

**Examples:**
- Input: "()" -> Output: true
- Input: "()[]{}" -> Output: true
- Input: "(]" -> Output: false
- Input: "([)]" -> Output: false

**Language:** python

**Starter Code:**
```python
def is_valid(s: str) -> bool:
    # Your solution here
    pass
```

**Evaluation Criteria:**
- Should use a stack. Look for clean handling of edge cases (empty string, single character).

---

## Challenge 3: LRU Cache (Medium)

**Title:** LRU Cache

**Description:**
Design a data structure that follows the Least Recently Used (LRU) cache eviction policy. Implement the `LRUCache` class:
- `LRUCache(capacity)` initializes the cache with a positive capacity.
- `get(key)` returns the value if the key exists, otherwise returns -1.
- `put(key, value)` updates or inserts the value. If the cache reaches capacity, evict the least recently used key before inserting.

Both `get` and `put` must run in O(1) average time.

**Examples:**
```
cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
cache.get(1)       # returns 1
cache.put(3, 3)    # evicts key 2
cache.get(2)       # returns -1
cache.get(3)       # returns 3
```

**Language:** python

**Starter Code:**
```python
class LRUCache:
    def __init__(self, capacity: int):
        # Your solution here
        pass

    def get(self, key: int) -> int:
        pass

    def put(self, key: int, value: int) -> None:
        pass
```

**Evaluation Criteria:**
- Optimal: OrderedDict or hash map + doubly linked list for O(1) operations. Check that they understand why a regular dict isn't sufficient for ordering.

---

## Challenge 4: Merge Intervals (Medium)

**Title:** Merge Intervals

**Description:**
Given an array of intervals where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.

**Examples:**
- Input: [[1,3],[2,6],[8,10],[15,18]] -> Output: [[1,6],[8,10],[15,18]]
- Input: [[1,4],[4,5]] -> Output: [[1,5]]

**Language:** python

**Starter Code:**
```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    # Your solution here
    pass
```

**Evaluation Criteria:**
- Should sort by start time first. Look for clean edge case handling (empty input, single interval, all overlapping).

---

## Challenge 5: Binary Tree Level Order Traversal (Medium)

**Title:** Binary Tree Level Order Traversal

**Description:**
Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

**Examples:**
```
Input: root = [3,9,20,null,null,15,7]
     3
    / \
   9  20
     /  \
    15   7
Output: [[3],[9,20],[15,7]]
```

**Language:** python

**Starter Code:**
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root: TreeNode | None) -> list[list[int]]:
    # Your solution here
    pass
```

**Evaluation Criteria:**
- Should use BFS with a queue. Bonus for clean code and handling the null root case. Alternative recursive DFS approach is also acceptable.
