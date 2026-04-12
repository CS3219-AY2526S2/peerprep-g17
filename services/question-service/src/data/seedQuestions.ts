/*
AI Assistance Disclosure:
Tool: ChatGPT, date: 2026-04-12
Scope: Generated and edited seed metadata for previously unsupported questions and removed SQL-only seed entries.
Author review: I validated the questions and checked the metadata manually.
*/
/**
 * Shared seed data - used by both the CLI script and the /seed API endpoint.
 */
const BASE_SEED_QUESTIONS = [
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
      { input: 'text1 = "abcde", text2 = "ace"', output: "3", explanation: 'The longest common subsequence is "ace".' },
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
    title: "Combination Sum",
    difficulty: "Medium",
    categories: ["Arrays", "Recursion"],
    description:
      "Given distinct candidates and a target, return all unique combinations where the chosen numbers sum to target.",
    examples: [
      { input: "candidates = [2,3,6,7], target = 7", output: "[[2,2,3],[7]]" },
      { input: "candidates = [2,3,5], target = 8", output: "[[2,2,2,2],[2,3,3],[3,5]]" },
    ],
    link: "https://leetcode.com/problems/combination-sum/",
  },
  {
    title: "Permutations",
    difficulty: "Medium",
    categories: ["Arrays", "Recursion"],
    description:
      "Given an array of distinct integers, return all possible permutations.",
    examples: [
      { input: "nums = [1,2,3]", output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" },
      { input: "nums = [0,1]", output: "[[0,1],[1,0]]" },
    ],
    link: "https://leetcode.com/problems/permutations/",
  },
  {
    title: "Subsets",
    difficulty: "Medium",
    categories: ["Arrays", "Recursion", "Bit Manipulation"],
    description:
      "Return all possible subsets of the given array of unique elements.",
    examples: [
      { input: "nums = [1,2,3]", output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]" },
      { input: "nums = [0]", output: "[[],[0]]" },
    ],
    link: "https://leetcode.com/problems/subsets/",
  },
  {
    title: "Word Search",
    difficulty: "Medium",
    categories: ["Arrays", "Strings", "Recursion"],
    description:
      "Given a board and a word, return true if the word exists in the grid using adjacent cells.",
    examples: [
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true" },
      { input: 'board = [["A","B"],["C","D"]], word = "ABCD"', output: "false" },
    ],
    link: "https://leetcode.com/problems/word-search/",
  },
  {
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    categories: ["Arrays", "Binary Search"],
    description:
      "Given two sorted arrays, return the median of the combined sorted sequence.",
    examples: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.50000" },
    ],
    link: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
  },
  {
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    categories: ["Arrays", "Binary Search"],
    description:
      "Given a rotated sorted array and a target, return the target index or -1 if it does not exist.",
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
    ],
    link: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
  },
  {
    title: "Find First and Last Position of Element in Sorted Array",
    difficulty: "Medium",
    categories: ["Arrays", "Binary Search"],
    description:
      "Given a sorted array, find the starting and ending position of a target value.",
    examples: [
      { input: "nums = [5,7,7,8,8,10], target = 8", output: "[3,4]" },
      { input: "nums = [5,7,7,8,8,10], target = 6", output: "[-1,-1]" },
    ],
    link: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/",
  },
  {
    title: "Search Insert Position",
    difficulty: "Easy",
    categories: ["Algorithms", "Binary Search"],
    description:
      "Given a sorted array and a target, return its index if found or the insertion position if not found.",
    examples: [
      { input: "nums = [1,3,5,6], target = 5", output: "2" },
      { input: "nums = [1,3,5,6], target = 2", output: "1" },
    ],
    link: "https://leetcode.com/problems/search-insert-position/",
  },
  {
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Given the root of a binary tree, return its inorder traversal.",
    examples: [
      { input: "root = [1,null,2,3]", output: "[1,3,2]" },
      { input: "root = []", output: "[]" },
    ],
    link: "https://leetcode.com/problems/binary-tree-inorder-traversal/",
  },
  {
    title: "Symmetric Tree",
    difficulty: "Easy",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Given the root of a binary tree, check whether it is a mirror of itself.",
    examples: [
      { input: "root = [1,2,2,3,4,4,3]", output: "true" },
      { input: "root = [1,2,2,null,3,null,3]", output: "false" },
    ],
    link: "https://leetcode.com/problems/symmetric-tree/",
  },
  {
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Return the level order traversal of a binary tree's nodes' values.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
  },
  {
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Given the root of a binary tree, return its maximum depth.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "3" },
      { input: "root = [1,null,2]", output: "2" },
    ],
    link: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
  },
  {
    title: "Convert Sorted Array to Binary Search Tree",
    difficulty: "Easy",
    categories: ["Arrays", "Binary Search", "Data Structures"],
    description:
      "Given an integer array sorted in ascending order, convert it to a height-balanced BST.",
    examples: [
      { input: "nums = [-10,-3,0,5,9]", output: "[0,-3,9,-10,null,5]" },
      { input: "nums = [1,3]", output: "[3,1]" },
    ],
    link: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/",
  },
  {
    title: "Flatten Binary Tree to Linked List",
    difficulty: "Medium",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Flatten a binary tree to a linked list in-place following preorder traversal.",
    examples: [
      { input: "root = [1,2,5,3,4,null,6]", output: "[1,null,2,null,3,null,4,null,5,null,6]" },
      { input: "root = []", output: "[]" },
    ],
    link: "https://leetcode.com/problems/flatten-binary-tree-to-linked-list/",
  },
  {
    title: "Binary Tree Right Side View",
    difficulty: "Medium",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Return the values of the nodes you can see when looking at a binary tree from the right side.",
    examples: [
      { input: "root = [1,2,3,null,5,null,4]", output: "[1,3,4]" },
      { input: "root = [1,null,3]", output: "[1,3]" },
    ],
    link: "https://leetcode.com/problems/binary-tree-right-side-view/",
  },
  {
    title: "Invert Binary Tree",
    difficulty: "Easy",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Invert a binary tree and return its root.",
    examples: [
      { input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" },
      { input: "root = [2,1,3]", output: "[2,3,1]" },
    ],
    link: "https://leetcode.com/problems/invert-binary-tree/",
  },
  {
    title: "Kth Smallest Element in a BST",
    difficulty: "Medium",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Given the root of a BST and an integer k, return the kth smallest value in the tree.",
    examples: [
      { input: "root = [3,1,4,null,2], k = 1", output: "1" },
      { input: "root = [5,3,6,2,4,null,null,1], k = 3", output: "3" },
    ],
    link: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/",
  },
  {
    title: "Lowest Common Ancestor of a Binary Tree",
    difficulty: "Medium",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Given a binary tree, find the lowest common ancestor of two nodes.",
    examples: [
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1", output: "3" },
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4", output: "5" },
    ],
    link: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/",
  },
  {
    title: "Diameter of Binary Tree",
    difficulty: "Easy",
    categories: ["Data Structures", "Depth-First Search"],
    description:
      "Return the length of the diameter of a binary tree.",
    examples: [
      { input: "root = [1,2,3,4,5]", output: "3" },
      { input: "root = [1,2]", output: "1" },
    ],
    link: "https://leetcode.com/problems/diameter-of-binary-tree/",
  },
  {
    title: "Climbing Stairs",
    difficulty: "Easy",
    categories: ["Math", "Dynamic Programming", "Recursion"],
    description:
      "Each time you can climb 1 or 2 steps. Return how many distinct ways there are to reach the top.",
    examples: [
      { input: "n = 2", output: "2" },
      { input: "n = 3", output: "3" },
    ],
    link: "https://leetcode.com/problems/climbing-stairs/",
  },
  {
    title: "Word Break",
    difficulty: "Medium",
    categories: ["Strings", "Dynamic Programming", "Hash Table"],
    description:
      "Return true if s can be segmented into a sequence of one or more dictionary words.",
    examples: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
      { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" },
    ],
    link: "https://leetcode.com/problems/word-break/",
  },
  {
    title: "Number of Islands",
    difficulty: "Medium",
    categories: ["Arrays", "Depth-First Search"],
    description:
      "Given an m x n grid of 1s and 0s, return the number of islands.",
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3" },
    ],
    link: "https://leetcode.com/problems/number-of-islands/",
  },
  {
    title: "Jump Game",
    difficulty: "Medium",
    categories: ["Arrays", "Dynamic Programming", "Greedy"],
    description:
      "Given an array where each element represents your maximum jump length, return true if you can reach the last index.",
    examples: [
      { input: "nums = [2,3,1,1,4]", output: "true" },
      { input: "nums = [3,2,1,0,4]", output: "false" },
    ],
    link: "https://leetcode.com/problems/jump-game/",
  },
  {
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    categories: ["Arrays", "Dynamic Programming", "Greedy"],
    description:
      "Choose one day to buy and a later day to sell the stock to maximize profit.",
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5" },
      { input: "prices = [7,6,4,3,1]", output: "0" },
    ],
    link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
  },
  {
    title: "Group Anagrams",
    difficulty: "Medium",
    categories: ["Arrays", "Hash Table", "Strings", "Sorting"],
    description:
      "Group the input strings into groups of anagrams.",
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' },
    ],
    link: "https://leetcode.com/problems/group-anagrams/",
  },
  {
    title: "Top K Frequent Elements",
    difficulty: "Medium",
    categories: ["Arrays", "Hash Table", "Algorithms"],
    description:
      "Return the k most frequent elements from the array.",
    examples: [
      { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
      { input: "nums = [1], k = 1", output: "[1]" },
    ],
    link: "https://leetcode.com/problems/top-k-frequent-elements/",
  },
  {
    title: "Add Two Numbers",
    difficulty: "Medium",
    categories: ["Data Structures", "Math", "Recursion"],
    description:
      "Add two numbers represented by linked lists and return the sum as a linked list.",
    examples: [
      { input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]" },
      { input: "l1 = [0], l2 = [0]", output: "[0]" },
    ],
    link: "https://leetcode.com/problems/add-two-numbers/",
  },
  {
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    categories: ["Data Structures", "Recursion"],
    description:
      "Merge two sorted linked lists and return the merged sorted list.",
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
    ],
    link: "https://leetcode.com/problems/merge-two-sorted-lists/",
  },
  {
    title: "Min Stack",
    difficulty: "Medium",
    categories: ["Data Structures"],
    description:
      "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    examples: [
      {
        input: '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[[],[-2],[0],[-3],[],[],[],[]]',
        output: "[null,null,null,null,-3,null,0,-2]",
      },
    ],
    link: "https://leetcode.com/problems/min-stack/",
  },
  {
    title: "Container With Most Water",
    difficulty: "Medium",
    categories: ["Arrays", "Greedy"],
    description:
      "Given n vertical lines, find two that together with the x-axis form a container that holds the most water.",
    examples: [
      { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
      { input: "height = [1,1]", output: "1" },
    ],
    link: "https://leetcode.com/problems/container-with-most-water/",
  },
];

type ExecutionMode = "python_function" | "python_class" | "unsupported";
type ComparisonMode = "exact_json" | "float_tolerance";

interface SeedExecutionMetadata {
  executionMode: ExecutionMode;
  starterCode: { python: string };
  visibleTestCases: unknown[];
  hiddenTestCases: unknown[];
  judgeConfig: {
    className?: string;
    methodName?: string;
    comparisonMode: ComparisonMode;
    timeLimitMs: number;
    memoryLimitMb: number;
  } | null;
}

const DEFAULT_LIMITS = {
  comparisonMode: "exact_json" as const,
  timeLimitMs: 4000,
  memoryLimitMb: 256,
};

function functionTemplate(methodName: string, signature: string, _body: string): string {
  return [
    "class Solution:",
    `    def ${methodName}(self, ${signature}):`,
    "        pass",
  ].join("\n");
}

function classTemplate(className: string, methods: string[]): string {
  const skeletonMethods = methods
    .map((method) => method.trim())
    .filter((method) => method.startsWith("def "))
    .flatMap((method) => [`    ${method}`, "        pass", ""]);

  return [
    `class ${className}:`,
    ...skeletonMethods.slice(0, -1),
  ].join("\n");
}

const EXECUTION_METADATA_BY_TITLE: Record<string, SeedExecutionMetadata> = {
  "Roman to Integer": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "romanToInt",
        "s",
        [
          "values = {",
          "    'I': 1, 'V': 5, 'X': 10, 'L': 50,",
          "    'C': 100, 'D': 500, 'M': 1000,",
          "}",
          "total = 0",
          "for index, char in enumerate(s):",
          "    if index + 1 < len(s) and values[char] < values[s[index + 1]]:",
          "        total -= values[char]",
          "    else:",
          "        total += values[char]",
          "return total",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "roman-visible-1", args: ["III"], expected: 3 },
      { id: "roman-visible-2", args: ["MCMXCIV"], expected: 1994 },
    ],
    hiddenTestCases: [
      { id: "roman-hidden-1", args: ["LVIII"], expected: 58 },
      { id: "roman-hidden-2", args: ["XL"], expected: 40 },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "romanToInt",
      ...DEFAULT_LIMITS,
    },
  },
  "Add Binary": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "addBinary",
        "a, b",
        ["carry = 0", "result = []", "i = len(a) - 1", "j = len(b) - 1", "while i >= 0 or j >= 0 or carry:", "    total = carry", "    if i >= 0:", "        total += int(a[i])", "        i -= 1", "    if j >= 0:", "        total += int(b[j])", "        j -= 1", "    result.append(str(total % 2))", "    carry = total // 2", "return ''.join(reversed(result))"].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "binary-visible-1", args: ["11", "1"], expected: "100" },
      { id: "binary-visible-2", args: ["1010", "1011"], expected: "10101" },
    ],
    hiddenTestCases: [
      { id: "binary-hidden-1", args: ["0", "0"], expected: "0" },
      { id: "binary-hidden-2", args: ["1111", "1"], expected: "10000" },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "addBinary",
      ...DEFAULT_LIMITS,
    },
  },
  "Fibonacci Number": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "fib",
        "n",
        ["if n <= 1:", "    return n", "prev, curr = 0, 1", "for _ in range(2, n + 1):", "    prev, curr = curr, prev + curr", "return curr"].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "fib-visible-1", args: [2], expected: 1 },
      { id: "fib-visible-2", args: [4], expected: 3 },
    ],
    hiddenTestCases: [
      { id: "fib-hidden-1", args: [0], expected: 0 },
      { id: "fib-hidden-2", args: [10], expected: 55 },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "fib",
      ...DEFAULT_LIMITS,
    },
  },
  "Implement Stack using Queues": {
    executionMode: "python_class",
    starterCode: {
      python: classTemplate("MyStack", [
        "def __init__(self):",
        "    self.items = []",
        "",
        "def push(self, x):",
        "    self.items.append(x)",
        "",
        "def pop(self):",
        "    return self.items.pop()",
        "",
        "def top(self):",
        "    return self.items[-1]",
        "",
        "def empty(self):",
        "    return len(self.items) == 0",
      ]),
    },
    visibleTestCases: [
      {
        id: "stack-visible-1",
        operations: ["MyStack", "push", "push", "top", "pop", "empty"],
        arguments: [[], [1], [2], [], [], []],
        expected: [null, null, null, 2, 2, false],
      },
    ],
    hiddenTestCases: [
      {
        id: "stack-hidden-1",
        operations: ["MyStack", "push", "empty", "pop", "empty"],
        arguments: [[], [5], [], [], []],
        expected: [null, null, false, 5, true],
      },
    ],
    judgeConfig: {
      className: "MyStack",
      comparisonMode: "exact_json",
      timeLimitMs: 4000,
      memoryLimitMb: 256,
    },
  },
  "Repeated DNA Sequences": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "findRepeatedDnaSequences",
        "s",
        [
          "seen = set()",
          "duplicates = set()",
          "for index in range(max(0, len(s) - 9)):",
          "    segment = s[index:index + 10]",
          "    if segment in seen:",
          "        duplicates.add(segment)",
          "    else:",
          "        seen.add(segment)",
          "return sorted(duplicates)",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      {
        id: "dna-visible-1",
        args: ["AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"],
        expected: ["AAAAACCCCC", "CCCCCAAAAA"],
      },
      { id: "dna-visible-2", args: ["AAAAAAAAAAAAA"], expected: ["AAAAAAAAAA"] },
    ],
    hiddenTestCases: [
      { id: "dna-hidden-1", args: ["ACGTACGTAC"], expected: [] },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "findRepeatedDnaSequences",
      ...DEFAULT_LIMITS,
    },
  },
  "Course Schedule": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "canFinish",
        "numCourses, prerequisites",
        [
          "from collections import defaultdict, deque",
          "graph = defaultdict(list)",
          "indegree = [0] * numCourses",
          "for course, prereq in prerequisites:",
          "    graph[prereq].append(course)",
          "    indegree[course] += 1",
          "queue = deque(index for index, degree in enumerate(indegree) if degree == 0)",
          "visited = 0",
          "while queue:",
          "    node = queue.popleft()",
          "    visited += 1",
          "    for neighbor in graph[node]:",
          "        indegree[neighbor] -= 1",
          "        if indegree[neighbor] == 0:",
          "            queue.append(neighbor)",
          "return visited == numCourses",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "course-visible-1", args: [2, [[1, 0]]], expected: true },
      { id: "course-visible-2", args: [2, [[1, 0], [0, 1]]], expected: false },
    ],
    hiddenTestCases: [
      { id: "course-hidden-1", args: [3, [[1, 0], [2, 1]]], expected: true },
      { id: "course-hidden-2", args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "canFinish",
      ...DEFAULT_LIMITS,
    },
  },
  "LRU Cache Design": {
    executionMode: "python_class",
    starterCode: {
      python: classTemplate("LRUCache", [
        "def __init__(self, capacity):",
        "    from collections import OrderedDict",
        "    self.capacity = capacity",
        "    self.cache = OrderedDict()",
        "",
        "def get(self, key):",
        "    if key not in self.cache:",
        "        return -1",
        "    self.cache.move_to_end(key)",
        "    return self.cache[key]",
        "",
        "def put(self, key, value):",
        "    if key in self.cache:",
        "        self.cache.move_to_end(key)",
        "    self.cache[key] = value",
        "    if len(self.cache) > self.capacity:",
        "        self.cache.popitem(last=False)",
      ]),
    },
    visibleTestCases: [
      {
        id: "lru-visible-1",
        operations: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
        arguments: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
        expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
      },
    ],
    hiddenTestCases: [
      {
        id: "lru-hidden-1",
        operations: ["LRUCache", "put", "put", "get", "put", "get", "get"],
        arguments: [[1], [2, 1], [3, 2], [2], [4, 3], [2], [4]],
        expected: [null, null, null, -1, null, -1, 3],
      },
    ],
    judgeConfig: {
      className: "LRUCache",
      comparisonMode: "exact_json",
      timeLimitMs: 4000,
      memoryLimitMb: 256,
    },
  },
  "Longest Common Subsequence": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "longestCommonSubsequence",
        "text1, text2",
        [
          "rows = len(text1) + 1",
          "cols = len(text2) + 1",
          "dp = [[0] * cols for _ in range(rows)]",
          "for i in range(len(text1) - 1, -1, -1):",
          "    for j in range(len(text2) - 1, -1, -1):",
          "        if text1[i] == text2[j]:",
          "            dp[i][j] = 1 + dp[i + 1][j + 1]",
          "        else:",
          "            dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])",
          "return dp[0][0]",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "lcs-visible-1", args: ["abcde", "ace"], expected: 3 },
      { id: "lcs-visible-2", args: ["abc", "def"], expected: 0 },
    ],
    hiddenTestCases: [
      { id: "lcs-hidden-1", args: ["abc", "abc"], expected: 3 },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "longestCommonSubsequence",
      ...DEFAULT_LIMITS,
    },
  },
  "Airplane Seat Assignment Probability": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "nthPersonGetsNthSeat",
        "n",
        ["if n == 1:", "    return 1.0", "return 0.5"].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "seat-visible-1", args: [1], expected: 1 },
      { id: "seat-visible-2", args: [2], expected: 0.5 },
    ],
    hiddenTestCases: [
      { id: "seat-hidden-1", args: [5], expected: 0.5 },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "nthPersonGetsNthSeat",
      comparisonMode: "float_tolerance",
      timeLimitMs: 4000,
      memoryLimitMb: 256,
    },
  },
  "Subsets": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "subsets",
        "nums",
        [
          "result = [[]]",
          "for num in nums:",
          "    result += [subset + [num] for subset in result]",
          "return result",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      {
        id: "subsets-visible-1",
        args: [[1, 2, 3]],
        expected: [
          [],
          [1],
          [2],
          [1, 2],
          [3],
          [1, 3],
          [2, 3],
          [1, 2, 3],
        ],
      },
      {
        id: "subsets-visible-2",
        args: [[0]],
        expected: [[], [0]],
      },
    ],
    hiddenTestCases: [
      {
        id: "subsets-hidden-1",
        args: [[1, 2]],
        expected: [[], [1], [2], [1, 2]],
      },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "subsets",
      ...DEFAULT_LIMITS,
    },
  },
  "Reverse a String": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate("reverseString", "s", ["return list(reversed(s))"].join("\n")),
    },
    visibleTestCases: [
      { id: "reverse-visible-1", args: [["h", "e", "l", "l", "o"]], expected: ["o", "l", "l", "e", "h"] },
      { id: "reverse-visible-2", args: [["H", "a", "n", "n", "a", "h"]], expected: ["h", "a", "n", "n", "a", "H"] },
    ],
    hiddenTestCases: [{ id: "reverse-hidden-1", args: [["a"]], expected: ["a"] }],
    judgeConfig: { className: "Solution", methodName: "reverseString", ...DEFAULT_LIMITS },
  },
  "Linked List Cycle Detection": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate("hasCycle", "values, pos", ["return pos >= 0 and pos < len(values)"].join("\n")),
    },
    visibleTestCases: [
      { id: "cycle-visible-1", args: [[3, 2, 0, -4], 1], expected: true },
      { id: "cycle-visible-2", args: [[1], -1], expected: false },
    ],
    hiddenTestCases: [{ id: "cycle-hidden-1", args: [[1, 2], 0], expected: true }],
    judgeConfig: { className: "Solution", methodName: "hasCycle", ...DEFAULT_LIMITS },
  },
  "Rotate Image": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "rotate",
        "matrix",
        ["n = len(matrix)", "return [[matrix[n - 1 - r][c] for r in range(n)] for c in range(n)]"].join("\n"),
      ),
    },
    visibleTestCases: [{ id: "rotate-visible-1", args: [[[ [1,2,3],[4,5,6],[7,8,9] ][0], [[1,2,3],[4,5,6],[7,8,9]][1], [[1,2,3],[4,5,6],[7,8,9]][2] ]], expected: [[7,4,1],[8,5,2],[9,6,3]] }],
    hiddenTestCases: [{ id: "rotate-hidden-1", args: [[[ [1,2],[3,4] ][0], [[1,2],[3,4]][1] ]], expected: [[3,1],[4,2]] }],
    judgeConfig: { className: "Solution", methodName: "rotate", ...DEFAULT_LIMITS },
  },
  "Validate Binary Search Tree": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate("isValidBST", "values", ["return values == sorted(values) and len(values) == len(set(values))"].join("\n")),
    },
    visibleTestCases: [
      { id: "bst-visible-1", args: [[1, 2, 3]], expected: true },
      { id: "bst-visible-2", args: [[5, 1, 4, 3, 6]], expected: false },
    ],
    hiddenTestCases: [{ id: "bst-hidden-1", args: [[2, 2, 3]], expected: false }],
    judgeConfig: { className: "Solution", methodName: "isValidBST", ...DEFAULT_LIMITS },
  },
  "Serialize and Deserialize a Binary Tree": {
    executionMode: "python_class",
    starterCode: {
      python: classTemplate("Codec", [
        "def serialize(self, root):",
        "    return ','.join('null' if value is None else str(value) for value in root)",
        "",
        "def deserialize(self, data):",
        "    return [None if token == 'null' else int(token) for token in data.split(',')] if data else []",
      ]),
    },
    visibleTestCases: [
      {
        id: "codec-visible-1",
        operations: ["Codec", "serialize", "deserialize"],
        arguments: [[], [[1, 2, 3, null, null, 4, 5]], ["1,2,3,null,null,4,5"]],
        expected: [null, "1,2,3,null,null,4,5", [1, 2, 3, null, null, 4, 5]],
      },
    ],
    hiddenTestCases: [
      {
        id: "codec-hidden-1",
        operations: ["Codec", "serialize", "deserialize"],
        arguments: [[], [[1]], ["1"]],
        expected: [null, "1", [1]],
      },
    ],
    judgeConfig: { className: "Codec", comparisonMode: "exact_json", timeLimitMs: 4000, memoryLimitMb: 256 },
  },
  "Combination Sum": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate("combinationSum", "candidates, target", ["return []"].join("\n")),
    },
    visibleTestCases: [
      { id: "combsum-visible-1", args: [[2,3,6,7], 7], expected: [[2,2,3],[7]] },
      { id: "combsum-visible-2", args: [[2,3,5], 8], expected: [[2,2,2,2],[2,3,3],[3,5]] },
    ],
    hiddenTestCases: [{ id: "combsum-hidden-1", args: [[2], 1], expected: [] }],
    judgeConfig: { className: "Solution", methodName: "combinationSum", ...DEFAULT_LIMITS },
  },
  "Permutations": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("permute", "nums", ["return []"].join("\n")) },
    visibleTestCases: [
      { id: "perm-visible-1", args: [[1,2,3]], expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]] },
      { id: "perm-visible-2", args: [[0,1]], expected: [[0,1],[1,0]] },
    ],
    hiddenTestCases: [{ id: "perm-hidden-1", args: [[1]], expected: [[1]] }],
    judgeConfig: { className: "Solution", methodName: "permute", ...DEFAULT_LIMITS },
  },
  "Word Search": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("exist", "board, word", ["return False"].join("\n")) },
    visibleTestCases: [
      { id: "wordsearch-visible-1", args: [[[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]][0],[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]][1],[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]][2]], "ABCCED"], expected: true },
      { id: "wordsearch-visible-2", args: [[[["A","B"],["C","D"]][0],[["A","B"],["C","D"]][1]], "ABCD"], expected: false },
    ],
    hiddenTestCases: [{ id: "wordsearch-hidden-1", args: [[[["A"]][0]], "A"], expected: true }],
    judgeConfig: { className: "Solution", methodName: "exist", ...DEFAULT_LIMITS },
  },
  "Median of Two Sorted Arrays": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("findMedianSortedArrays", "nums1, nums2", ["merged = sorted(nums1 + nums2)", "mid = len(merged) // 2", "return merged[mid] if len(merged) % 2 else (merged[mid - 1] + merged[mid]) / 2"].join("\n")) },
    visibleTestCases: [
      { id: "median-visible-1", args: [[1,3], [2]], expected: 2 },
      { id: "median-visible-2", args: [[1,2], [3,4]], expected: 2.5 },
    ],
    hiddenTestCases: [{ id: "median-hidden-1", args: [[0,0], [0,0]], expected: 0 }],
    judgeConfig: { className: "Solution", methodName: "findMedianSortedArrays", comparisonMode: "float_tolerance", timeLimitMs: 4000, memoryLimitMb: 256 },
  },
  "Search in Rotated Sorted Array": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("search", "nums, target", ["return nums.index(target) if target in nums else -1"].join("\n")) },
    visibleTestCases: [
      { id: "rotsearch-visible-1", args: [[4,5,6,7,0,1,2], 0], expected: 4 },
      { id: "rotsearch-visible-2", args: [[4,5,6,7,0,1,2], 3], expected: -1 },
    ],
    hiddenTestCases: [{ id: "rotsearch-hidden-1", args: [[1], 0], expected: -1 }],
    judgeConfig: { className: "Solution", methodName: "search", ...DEFAULT_LIMITS },
  },
  "Find First and Last Position of Element in Sorted Array": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("searchRange", "nums, target", ["if target not in nums:", "    return [-1, -1]", "return [nums.index(target), len(nums) - 1 - nums[::-1].index(target)]"].join("\n")) },
    visibleTestCases: [
      { id: "range-visible-1", args: [[5,7,7,8,8,10], 8], expected: [3,4] },
      { id: "range-visible-2", args: [[5,7,7,8,8,10], 6], expected: [-1,-1] },
    ],
    hiddenTestCases: [{ id: "range-hidden-1", args: [[], 0], expected: [-1,-1] }],
    judgeConfig: { className: "Solution", methodName: "searchRange", ...DEFAULT_LIMITS },
  },
  "Search Insert Position": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("searchInsert", "nums, target", ["for i, num in enumerate(nums):", "    if num >= target:", "        return i", "return len(nums)"].join("\n")) },
    visibleTestCases: [
      { id: "insert-visible-1", args: [[1,3,5,6], 5], expected: 2 },
      { id: "insert-visible-2", args: [[1,3,5,6], 2], expected: 1 },
    ],
    hiddenTestCases: [{ id: "insert-hidden-1", args: [[1,3,5,6], 7], expected: 4 }],
    judgeConfig: { className: "Solution", methodName: "searchInsert", ...DEFAULT_LIMITS },
  },
  "Binary Tree Inorder Traversal": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("inorderTraversal", "values", ["return sorted(value for value in values if value is not None)"].join("\n")) },
    visibleTestCases: [
      { id: "inorder-visible-1", args: [[1, null, 2, 3]], expected: [1,3,2] },
      { id: "inorder-visible-2", args: [[]], expected: [] },
    ],
    hiddenTestCases: [{ id: "inorder-hidden-1", args: [[1]], expected: [1] }],
    judgeConfig: { className: "Solution", methodName: "inorderTraversal", ...DEFAULT_LIMITS },
  },
  "Symmetric Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("isSymmetric", "values", ["return values == values[::-1]"].join("\n")) },
    visibleTestCases: [
      { id: "sym-visible-1", args: [[1,2,2,3,4,4,3]], expected: true },
      { id: "sym-visible-2", args: [[1,2,2,null,3,null,3]], expected: false },
    ],
    hiddenTestCases: [{ id: "sym-hidden-1", args: [[1]], expected: true }],
    judgeConfig: { className: "Solution", methodName: "isSymmetric", ...DEFAULT_LIMITS },
  },
  "Binary Tree Level Order Traversal": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("levelOrder", "values", ["return []"].join("\n")) },
    visibleTestCases: [
      { id: "levelorder-visible-1", args: [[3,9,20,null,null,15,7]], expected: [[3],[9,20],[15,7]] },
      { id: "levelorder-visible-2", args: [[1]], expected: [[1]] },
    ],
    hiddenTestCases: [{ id: "levelorder-hidden-1", args: [[]], expected: [] }],
    judgeConfig: { className: "Solution", methodName: "levelOrder", ...DEFAULT_LIMITS },
  },
  "Maximum Depth of Binary Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("maxDepth", "values", ["if not values:", "    return 0", "return len([value for value in values if value is not None])"].join("\n")) },
    visibleTestCases: [
      { id: "maxdepth-visible-1", args: [[3,9,20,null,null,15,7]], expected: 3 },
      { id: "maxdepth-visible-2", args: [[1,null,2]], expected: 2 },
    ],
    hiddenTestCases: [{ id: "maxdepth-hidden-1", args: [[]], expected: 0 }],
    judgeConfig: { className: "Solution", methodName: "maxDepth", ...DEFAULT_LIMITS },
  },
  "Convert Sorted Array to Binary Search Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("sortedArrayToBST", "nums", ["return nums"].join("\n")) },
    visibleTestCases: [
      { id: "sortedbst-visible-1", args: [[-10,-3,0,5,9]], expected: [-10,-3,0,5,9] },
      { id: "sortedbst-visible-2", args: [[1,3]], expected: [1,3] },
    ],
    hiddenTestCases: [{ id: "sortedbst-hidden-1", args: [[]], expected: [] }],
    judgeConfig: { className: "Solution", methodName: "sortedArrayToBST", ...DEFAULT_LIMITS },
  },
  "Flatten Binary Tree to Linked List": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("flatten", "values", ["return [value for value in values if value is not None]"].join("\n")) },
    visibleTestCases: [
      { id: "flatten-visible-1", args: [[1,2,5,3,4,null,6]], expected: [1,2,3,4,5,6] },
      { id: "flatten-visible-2", args: [[]], expected: [] },
    ],
    hiddenTestCases: [{ id: "flatten-hidden-1", args: [[0]], expected: [0] }],
    judgeConfig: { className: "Solution", methodName: "flatten", ...DEFAULT_LIMITS },
  },
  "Binary Tree Right Side View": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("rightSideView", "values", ["return []"].join("\n")) },
    visibleTestCases: [
      { id: "rightview-visible-1", args: [[1,2,3,null,5,null,4]], expected: [1,3,4] },
      { id: "rightview-visible-2", args: [[1,null,3]], expected: [1,3] },
    ],
    hiddenTestCases: [{ id: "rightview-hidden-1", args: [[]], expected: [] }],
    judgeConfig: { className: "Solution", methodName: "rightSideView", ...DEFAULT_LIMITS },
  },
  "Invert Binary Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("invertTree", "values", ["return values"].join("\n")) },
    visibleTestCases: [
      { id: "invert-visible-1", args: [[4,2,7,1,3,6,9]], expected: [4,7,2,9,6,3,1] },
      { id: "invert-visible-2", args: [[2,1,3]], expected: [2,3,1] },
    ],
    hiddenTestCases: [{ id: "invert-hidden-1", args: [[]], expected: [] }],
    judgeConfig: { className: "Solution", methodName: "invertTree", ...DEFAULT_LIMITS },
  },
  "Kth Smallest Element in a BST": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("kthSmallest", "values, k", ["return sorted(value for value in values if value is not None)[k - 1]"].join("\n")) },
    visibleTestCases: [
      { id: "kth-visible-1", args: [[3,1,4,null,2], 1], expected: 1 },
      { id: "kth-visible-2", args: [[5,3,6,2,4,null,null,1], 3], expected: 3 },
    ],
    hiddenTestCases: [{ id: "kth-hidden-1", args: [[1], 1], expected: 1 }],
    judgeConfig: { className: "Solution", methodName: "kthSmallest", ...DEFAULT_LIMITS },
  },
  "Lowest Common Ancestor of a Binary Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("lowestCommonAncestor", "values, p, q", ["return p if p == q else values[0]"].join("\n")) },
    visibleTestCases: [
      { id: "lca-visible-1", args: [[3,5,1,6,2,0,8,null,null,7,4], 5, 1], expected: 3 },
      { id: "lca-visible-2", args: [[3,5,1,6,2,0,8,null,null,7,4], 5, 4], expected: 5 },
    ],
    hiddenTestCases: [{ id: "lca-hidden-1", args: [[1,2], 1, 2], expected: 1 }],
    judgeConfig: { className: "Solution", methodName: "lowestCommonAncestor", ...DEFAULT_LIMITS },
  },
  "Diameter of Binary Tree": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("diameterOfBinaryTree", "values", ["return 0"].join("\n")) },
    visibleTestCases: [
      { id: "diameter-visible-1", args: [[1,2,3,4,5]], expected: 3 },
      { id: "diameter-visible-2", args: [[1,2]], expected: 1 },
    ],
    hiddenTestCases: [{ id: "diameter-hidden-1", args: [[1]], expected: 0 }],
    judgeConfig: { className: "Solution", methodName: "diameterOfBinaryTree", ...DEFAULT_LIMITS },
  },
  "Climbing Stairs": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("climbStairs", "n", ["if n <= 2:", "    return n", "a, b = 1, 2", "for _ in range(3, n + 1):", "    a, b = b, a + b", "return b"].join("\n")) },
    visibleTestCases: [
      { id: "stairs-visible-1", args: [2], expected: 2 },
      { id: "stairs-visible-2", args: [3], expected: 3 },
    ],
    hiddenTestCases: [{ id: "stairs-hidden-1", args: [5], expected: 8 }],
    judgeConfig: { className: "Solution", methodName: "climbStairs", ...DEFAULT_LIMITS },
  },
  "Word Break": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("wordBreak", "s, wordDict", ["return False"].join("\n")) },
    visibleTestCases: [
      { id: "wordbreak-visible-1", args: ["leetcode", ["leet","code"]], expected: true },
      { id: "wordbreak-visible-2", args: ["catsandog", ["cats","dog","sand","and","cat"]], expected: false },
    ],
    hiddenTestCases: [{ id: "wordbreak-hidden-1", args: ["applepenapple", ["apple","pen"]], expected: true }],
    judgeConfig: { className: "Solution", methodName: "wordBreak", ...DEFAULT_LIMITS },
  },
  "Number of Islands": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("numIslands", "grid", ["return 0"].join("\n")) },
    visibleTestCases: [
      { id: "islands-visible-1", args: [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], expected: 1 },
      { id: "islands-visible-2", args: [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]], expected: 3 },
    ],
    hiddenTestCases: [{ id: "islands-hidden-1", args: [[["0"]]], expected: 0 }],
    judgeConfig: { className: "Solution", methodName: "numIslands", ...DEFAULT_LIMITS },
  },
  "Jump Game": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("canJump", "nums", ["reach = 0", "for index, jump in enumerate(nums):", "    if index > reach:", "        return False", "    reach = max(reach, index + jump)", "return True"].join("\n")) },
    visibleTestCases: [
      { id: "jump-visible-1", args: [[2,3,1,1,4]], expected: true },
      { id: "jump-visible-2", args: [[3,2,1,0,4]], expected: false },
    ],
    hiddenTestCases: [{ id: "jump-hidden-1", args: [[0]], expected: true }],
    judgeConfig: { className: "Solution", methodName: "canJump", ...DEFAULT_LIMITS },
  },
  "Best Time to Buy and Sell Stock": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("maxProfit", "prices", ["best = 0", "min_price = float('inf')", "for price in prices:", "    min_price = min(min_price, price)", "    best = max(best, price - min_price)", "return best"].join("\n")) },
    visibleTestCases: [
      { id: "stock-visible-1", args: [[7,1,5,3,6,4]], expected: 5 },
      { id: "stock-visible-2", args: [[7,6,4,3,1]], expected: 0 },
    ],
    hiddenTestCases: [{ id: "stock-hidden-1", args: [[1,2]], expected: 1 }],
    judgeConfig: { className: "Solution", methodName: "maxProfit", ...DEFAULT_LIMITS },
  },
  "Group Anagrams": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("groupAnagrams", "strs", ["return []"].join("\n")) },
    visibleTestCases: [
      { id: "anagrams-visible-1", args: [["eat","tea","tan","ate","nat","bat"]], expected: [["ate","eat","tea"],["bat"],["nat","tan"]] },
      { id: "anagrams-visible-2", args: [[""]], expected: [[""]] },
    ],
    hiddenTestCases: [{ id: "anagrams-hidden-1", args: [["a"]], expected: [["a"]] }],
    judgeConfig: { className: "Solution", methodName: "groupAnagrams", ...DEFAULT_LIMITS },
  },
  "Top K Frequent Elements": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("topKFrequent", "nums, k", ["from collections import Counter", "return [item for item, _ in Counter(nums).most_common(k)]"].join("\n")) },
    visibleTestCases: [
      { id: "topk-visible-1", args: [[1,1,1,2,2,3], 2], expected: [1,2] },
      { id: "topk-visible-2", args: [[1], 1], expected: [1] },
    ],
    hiddenTestCases: [{ id: "topk-hidden-1", args: [[4,4,4,6,6,7], 1], expected: [4] }],
    judgeConfig: { className: "Solution", methodName: "topKFrequent", ...DEFAULT_LIMITS },
  },
  "Add Two Numbers": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("addTwoNumbers", "l1, l2", ["carry = 0", "result = []", "i = 0", "while i < len(l1) or i < len(l2) or carry:", "    a = l1[i] if i < len(l1) else 0", "    b = l2[i] if i < len(l2) else 0", "    total = a + b + carry", "    result.append(total % 10)", "    carry = total // 10", "    i += 1", "return result"].join("\n")) },
    visibleTestCases: [
      { id: "addnums-visible-1", args: [[2,4,3], [5,6,4]], expected: [7,0,8] },
      { id: "addnums-visible-2", args: [[0], [0]], expected: [0] },
    ],
    hiddenTestCases: [{ id: "addnums-hidden-1", args: [[9,9], [1]], expected: [0,0,1] }],
    judgeConfig: { className: "Solution", methodName: "addTwoNumbers", ...DEFAULT_LIMITS },
  },
  "Merge Two Sorted Lists": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("mergeTwoLists", "list1, list2", ["result = []", "i = j = 0", "while i < len(list1) and j < len(list2):", "    if list1[i] <= list2[j]:", "        result.append(list1[i]); i += 1", "    else:", "        result.append(list2[j]); j += 1", "result.extend(list1[i:])", "result.extend(list2[j:])", "return result"].join("\n")) },
    visibleTestCases: [
      { id: "merge-visible-1", args: [[1,2,4], [1,3,4]], expected: [1,1,2,3,4,4] },
      { id: "merge-visible-2", args: [[], []], expected: [] },
    ],
    hiddenTestCases: [{ id: "merge-hidden-1", args: [[], [0]], expected: [0] }],
    judgeConfig: { className: "Solution", methodName: "mergeTwoLists", ...DEFAULT_LIMITS },
  },
  "Min Stack": {
    executionMode: "python_class",
    starterCode: {
      python: classTemplate("MinStack", [
        "def __init__(self):",
        "    self.stack = []",
        "    self.min_stack = []",
        "",
        "def push(self, val):",
        "    self.stack.append(val)",
        "    if not self.min_stack or val <= self.min_stack[-1]:",
        "        self.min_stack.append(val)",
        "",
        "def pop(self):",
        "    value = self.stack.pop()",
        "    if value == self.min_stack[-1]:",
        "        self.min_stack.pop()",
        "    return value",
        "",
        "def top(self):",
        "    return self.stack[-1]",
        "",
        "def getMin(self):",
        "    return self.min_stack[-1]",
      ]),
    },
    visibleTestCases: [
      {
        id: "minstack-visible-1",
        operations: ["MinStack","push","push","push","getMin","pop","top","getMin"],
        arguments: [[],[-2],[0],[-3],[],[],[],[]],
        expected: [null,null,null,null,-3,-3,0,-2],
      },
    ],
    hiddenTestCases: [
      {
        id: "minstack-hidden-1",
        operations: ["MinStack","push","getMin"],
        arguments: [[],[5],[]],
        expected: [null,null,5],
      },
    ],
    judgeConfig: { className: "MinStack", comparisonMode: "exact_json", timeLimitMs: 4000, memoryLimitMb: 256 },
  },
  "Container With Most Water": {
    executionMode: "python_function",
    starterCode: { python: functionTemplate("maxArea", "height", ["left, right = 0, len(height) - 1", "best = 0", "while left < right:", "    best = max(best, min(height[left], height[right]) * (right - left))", "    if height[left] < height[right]:", "        left += 1", "    else:", "        right -= 1", "return best"].join("\n")) },
    visibleTestCases: [
      { id: "container-visible-1", args: [[1,8,6,2,5,4,8,3,7]], expected: 49 },
      { id: "container-visible-2", args: [[1,1]], expected: 1 },
    ],
    hiddenTestCases: [{ id: "container-hidden-1", args: [[4,3,2,1,4]], expected: 16 }],
    judgeConfig: { className: "Solution", methodName: "maxArea", ...DEFAULT_LIMITS },
  },
  "Sliding Window Maximum": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "maxSlidingWindow",
        "nums, k",
        [
          "from collections import deque",
          "window = deque()",
          "result = []",
          "for index, value in enumerate(nums):",
          "    while window and window[0] <= index - k:",
          "        window.popleft()",
          "    while window and nums[window[-1]] <= value:",
          "        window.pop()",
          "    window.append(index)",
          "    if index >= k - 1:",
          "        result.append(nums[window[0]])",
          "return result",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "window-visible-1", args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { id: "window-visible-2", args: [[1], 1], expected: [1] },
    ],
    hiddenTestCases: [
      { id: "window-hidden-1", args: [[9, 8, 7, 6, 5], 2], expected: [9, 8, 7, 6] },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "maxSlidingWindow",
      ...DEFAULT_LIMITS,
    },
  },
  "N-Queen Problem": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "solveNQueens",
        "n",
        [
          "results = []",
          "cols = set()",
          "diag1 = set()",
          "diag2 = set()",
          "board = [['.'] * n for _ in range(n)]",
          "",
          "def backtrack(row):",
          "    if row == n:",
          "        results.append([''.join(line) for line in board])",
          "        return",
          "    for col in range(n):",
          "        if col in cols or (row - col) in diag1 or (row + col) in diag2:",
          "            continue",
          "        cols.add(col)",
          "        diag1.add(row - col)",
          "        diag2.add(row + col)",
          "        board[row][col] = 'Q'",
          "        backtrack(row + 1)",
          "        board[row][col] = '.'",
          "        cols.remove(col)",
          "        diag1.remove(row - col)",
          "        diag2.remove(row + col)",
          "",
          "backtrack(0)",
          "return sorted(results)",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      {
        id: "queen-visible-1",
        args: [4],
        expected: [[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]],
      },
    ],
    hiddenTestCases: [
      { id: "queen-hidden-1", args: [1], expected: [["Q"]] },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "solveNQueens",
      ...DEFAULT_LIMITS,
    },
  },
  "Wildcard Matching": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "isMatch",
        "s, p",
        [
          "rows = len(s) + 1",
          "cols = len(p) + 1",
          "dp = [[False] * cols for _ in range(rows)]",
          "dp[0][0] = True",
          "for j in range(1, cols):",
          "    if p[j - 1] == '*':",
          "        dp[0][j] = dp[0][j - 1]",
          "for i in range(1, rows):",
          "    for j in range(1, cols):",
          "        if p[j - 1] == '*':",
          "            dp[i][j] = dp[i][j - 1] or dp[i - 1][j]",
          "        elif p[j - 1] == '?' or s[i - 1] == p[j - 1]:",
          "            dp[i][j] = dp[i - 1][j - 1]",
          "return dp[-1][-1]",
        ].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "wild-visible-1", args: ["aa", "a"], expected: false },
      { id: "wild-visible-2", args: ["aa", "*"], expected: true },
    ],
    hiddenTestCases: [
      { id: "wild-hidden-1", args: ["cb", "?a"], expected: false },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "isMatch",
      ...DEFAULT_LIMITS,
    },
  },
  "Chalkboard XOR Game": {
    executionMode: "python_function",
    starterCode: {
      python: functionTemplate(
        "xorGame",
        "nums",
        ["xor_total = 0", "for value in nums:", "    xor_total ^= value", "return xor_total == 0 or len(nums) % 2 == 0"].join("\n"),
      ),
    },
    visibleTestCases: [
      { id: "xor-visible-1", args: [[1, 1, 2]], expected: false },
      { id: "xor-visible-2", args: [[0, 1]], expected: true },
    ],
    hiddenTestCases: [
      { id: "xor-hidden-1", args: [[1, 2, 3]], expected: false },
    ],
    judgeConfig: {
      className: "Solution",
      methodName: "xorGame",
      ...DEFAULT_LIMITS,
    },
  },
};

export const SEED_QUESTIONS = BASE_SEED_QUESTIONS.map((question) => {
  const metadata = EXECUTION_METADATA_BY_TITLE[question.title];

  if (!metadata) {
    return {
      ...question,
      executionMode: "unsupported",
      starterCode: { python: "" },
      visibleTestCases: [],
      hiddenTestCases: [],
      judgeConfig: null,
    };
  }

  return {
    ...question,
    ...metadata,
  };
});
