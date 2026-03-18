/**
 * Shared seed data – used by both the CLI script and the /seed API endpoint.
 */
export const SEED_QUESTIONS = [
  {
    title: "Reverse a String",
    difficulty: "Easy",
    categories: ["Strings", "Algorithms"],
    description:
      "Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.",
    examples: [
      { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
      { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
    ],
    link: "https://leetcode.com/problems/reverse-string/",
  },
  {
    title: "Linked List Cycle Detection",
    difficulty: "Easy",
    categories: ["Data Structures", "Algorithms"],
    description:
      "Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.",
    examples: [
      { input: "head = [3,2,0,-4], pos = 1", output: "true", explanation: "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed)." },
      { input: "head = [1], pos = -1", output: "false", explanation: "There is no cycle in the linked list." },
    ],
    link: "https://leetcode.com/problems/linked-list-cycle/",
  },
  {
    title: "Roman to Integer",
    difficulty: "Easy",
    categories: ["Algorithms", "Math"],
    description:
      "Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M. Given a roman numeral, convert it to an integer.",
    examples: [
      { input: 's = "III"', output: "3", explanation: "III = 3." },
      { input: 's = "LVIII"', output: "58", explanation: "L = 50, V = 5, III = 3." },
      { input: 's = "MCMXCIV"', output: "1994", explanation: "M = 1000, CM = 900, XC = 90 and IV = 4." },
    ],
    link: "https://leetcode.com/problems/roman-to-integer/",
  },
  {
    title: "Add Binary",
    difficulty: "Easy",
    categories: ["Bit Manipulation", "Algorithms"],
    description:
      "Given two binary strings a and b, return their sum as a binary string.",
    examples: [
      { input: 'a = "11", b = "1"', output: '"100"' },
      { input: 'a = "1010", b = "1011"', output: '"10101"' },
    ],
    link: "https://leetcode.com/problems/add-binary/",
  },
  {
    title: "Fibonacci Number",
    difficulty: "Easy",
    categories: ["Recursion", "Algorithms", "Dynamic Programming"],
    description:
      "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. Given n, calculate F(n).",
    examples: [
      { input: "n = 2", output: "1", explanation: "F(2) = F(1) + F(0) = 1 + 0 = 1." },
      { input: "n = 4", output: "3", explanation: "F(4) = F(3) + F(2) = 2 + 1 = 3." },
    ],
    link: "https://leetcode.com/problems/fibonacci-number/",
  },
  {
    title: "Implement Stack using Queues",
    difficulty: "Easy",
    categories: ["Data Structures"],
    description:
      "Implement a last-in-first-out (LIFO) stack using only two queues. The implemented stack should support all the functions of a normal stack (push, top, pop, and empty).",
    examples: [
      {
        input: '["MyStack", "push", "push", "top", "pop", "empty"]\n[[], [1], [2], [], [], []]',
        output: "[null, null, null, 2, 2, false]",
      },
    ],
    link: "https://leetcode.com/problems/implement-stack-using-queues/",
  },
  {
    title: "Combine Two Tables",
    difficulty: "Easy",
    categories: ["Databases"],
    description:
      "Given tables Person and Address, write a solution to report the first name, last name, city, and state of each person in the Person table. If the address of a personId is not present in the Address table, report null instead.",
    examples: [],
    link: "https://leetcode.com/problems/combine-two-tables/",
  },
  {
    title: "Repeated DNA Sequences",
    difficulty: "Medium",
    categories: ["Algorithms", "Bit Manipulation", "Hash Table"],
    description:
      "The DNA sequence is composed of a series of nucleotides abbreviated as A, C, G, and T. Given a string s that represents a DNA sequence, return all the 10-letter-long sequences (substrings) that occur more than once in a DNA molecule. You may return the answer in any order.",
    examples: [
      { input: 's = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"', output: '["AAAAACCCCC","CCCCCAAAAA"]' },
      { input: 's = "AAAAAAAAAAAAA"', output: '["AAAAAAAAAA"]' },
    ],
    link: "https://leetcode.com/problems/repeated-dna-sequences/",
  },
  {
    title: "Course Schedule",
    difficulty: "Medium",
    categories: ["Data Structures", "Algorithms", "Depth-First Search"],
    description:
      "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.",
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true", explanation: "You can take course 0 then course 1." },
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false", explanation: "There is a cycle, so it is impossible." },
    ],
    link: "https://leetcode.com/problems/course-schedule/",
  },
  {
    title: "LRU Cache Design",
    difficulty: "Medium",
    categories: ["Data Structures", "Algorithms"],
    description:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class with get and put operations, each running in O(1) average time complexity.",
    examples: [
      {
        input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
      },
    ],
    link: "https://leetcode.com/problems/lru-cache/",
  },
  {
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    categories: ["Strings", "Algorithms", "Dynamic Programming"],
    description:
      "Given two strings text1 and text2, return the length of their longest common subsequence. A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements. If there is no common subsequence, return 0.",
    examples: [
      { input: 'text1 = "abcde", text2 = "ace"', output: "3", explanation: 'The longest common subsequence is "ace" and its length is 3.' },
      { input: 'text1 = "abc", text2 = "def"', output: "0", explanation: "There is no such common subsequence, so the result is 0." },
    ],
    link: "https://leetcode.com/problems/longest-common-subsequence/",
  },
  {
    title: "Rotate Image",
    difficulty: "Medium",
    categories: ["Arrays", "Algorithms", "Math"],
    description:
      "You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise). You have to rotate the image in-place, which means you have to modify the input 2D matrix directly. Do not allocate another 2D matrix and do the rotation.",
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[[7,4,1],[8,5,2],[9,6,3]]" },
    ],
    link: "https://leetcode.com/problems/rotate-image/",
  },
  {
    title: "Airplane Seat Assignment Probability",
    difficulty: "Medium",
    categories: ["Brainteaser", "Math"],
    description:
      "n passengers board an airplane with exactly n seats. The first passenger has lost their ticket and picks a seat randomly. After that, the rest of the passengers will sit in their own seat if it is still available, or pick other seats randomly when they find their seat occupied. Return the probability that the n-th person gets their own seat.",
    examples: [
      { input: "n = 1", output: "1.00000" },
      { input: "n = 2", output: "0.50000" },
    ],
    link: "https://leetcode.com/problems/airplane-seat-assignment-probability/",
  },
  {
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    categories: ["Data Structures", "Algorithms", "Depth-First Search"],
    description:
      "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as a node whose left subtree contains only nodes with keys less than the node's key, and whose right subtree only nodes with keys greater than the node's key. Both subtrees must also be valid BSTs.",
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false", explanation: "The root node's value is 5 but its right child's value is 4." },
    ],
    link: "https://leetcode.com/problems/validate-binary-search-tree/",
  },
  {
    title: "Sliding Window Maximum",
    difficulty: "Hard",
    categories: ["Arrays", "Algorithms"],
    description:
      "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position. Return the max sliding window.",
    examples: [
      { input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[3,3,5,5,6,7]" },
      { input: "nums = [1], k = 1", output: "[1]" },
    ],
    link: "https://leetcode.com/problems/sliding-window-maximum/",
  },
  {
    title: "N-Queen Problem",
    difficulty: "Hard",
    categories: ["Algorithms", "Recursion"],
    description:
      'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle. Each solution contains a distinct board configuration where "Q" indicates a queen and "." indicates an empty space.',
    examples: [
      {
        input: "n = 4",
        output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
        explanation: "There exist two distinct solutions to the 4-queens puzzle.",
      },
    ],
    link: "https://leetcode.com/problems/n-queens/",
  },
  {
    title: "Serialize and Deserialize a Binary Tree",
    difficulty: "Hard",
    categories: ["Data Structures", "Algorithms"],
    description:
      "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later. Design an algorithm to serialize and deserialize a binary tree.",
    examples: [
      { input: "root = [1,2,3,null,null,4,5]", output: "[1,2,3,null,null,4,5]" },
    ],
    link: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/",
  },
  {
    title: "Wildcard Matching",
    difficulty: "Hard",
    categories: ["Strings", "Algorithms", "Dynamic Programming"],
    description:
      'Given an input string s and a pattern p, implement wildcard pattern matching with support for "?" (matches any single character) and "*" (matches any sequence of characters, including the empty sequence). The matching should cover the entire input string.',
    examples: [
      { input: 's = "aa", p = "a"', output: "false", explanation: '"a" does not match the entire string "aa".' },
      { input: 's = "aa", p = "*"', output: "true", explanation: '"*" matches any sequence.' },
    ],
    link: "https://leetcode.com/problems/wildcard-matching/",
  },
  {
    title: "Chalkboard XOR Game",
    difficulty: "Hard",
    categories: ["Brainteaser", "Math", "Bit Manipulation"],
    description:
      "You are given an array of integers nums represents the numbers written on a chalkboard. Alice and Bob take turns erasing exactly one number from the chalkboard, with Alice starting first. If erasing a number causes the bitwise XOR of all the elements to become 0, then that player loses. The bitwise XOR of one element is that element itself, and the XOR of no elements is 0. Also, if any player starts with the XOR of all elements equal to 0, that player wins. Return true if and only if Alice wins the game, assuming both play optimally.",
    examples: [
      { input: "nums = [1,1,2]", output: "false" },
      { input: "nums = [0,1]", output: "true" },
    ],
    link: "https://leetcode.com/problems/chalkboard-xor-game/",
  },
  {
    title: "Trips and Users",
    difficulty: "Hard",
    categories: ["Databases"],
    description:
      'Write a solution to find the cancellation rate of requests with unbanned users (both client and driver must not be banned) each day between "2013-10-01" and "2013-10-03". Round the cancellation rate to two decimal points.',
    examples: [],
    link: "https://leetcode.com/problems/trips-and-users/",
  },
];
