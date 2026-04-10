/**
 * Shared seed data - used by both the CLI script and the /seed API endpoint.
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
      "The Fibonacci numbers, commonly denoted F(n), form a sequence where each number is the sum of the two preceding ones. Given n, calculate F(n).",
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
      "Implement a last-in-first-out stack using only two queues. Support push, top, pop, and empty.",
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
      "Given tables Person and Address, write a query to report the first name, last name, city, and state of each person. If the address is missing, report null instead.",
    examples: [],
    link: "https://leetcode.com/problems/combine-two-tables/",
  },
  {
    title: "Repeated DNA Sequences",
    difficulty: "Medium",
    categories: ["Algorithms", "Bit Manipulation", "Hash Table"],
    description:
      "Given a DNA string, return all 10-letter-long sequences that occur more than once.",
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
      "There are numCourses courses to take and prerequisites pairs. Return true if you can finish all courses.",
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
      "Design an LRU cache that supports get and put in O(1) average time.",
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
      "Given two strings text1 and text2, return the length of their longest common subsequence.",
    examples: [
      { input: 'text1 = "abcde", text2 = "ace"', output: "3", explanation: 'The longest common subsequence is "ace".' },
      { input: 'text1 = "abc", text2 = "def"', output: "0", explanation: "There is no common subsequence." },
    ],
    link: "https://leetcode.com/problems/longest-common-subsequence/",
  },
  {
    title: "Rotate Image",
    difficulty: "Medium",
    categories: ["Arrays", "Algorithms", "Math"],
    description:
      "Rotate an n x n matrix by 90 degrees clockwise in-place.",
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
      "Return the probability that the n-th passenger gets their own seat under the airplane-seat process.",
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
      "Given the root of a binary tree, determine if it is a valid binary search tree.",
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false", explanation: "The right subtree violates the BST rule." },
    ],
    link: "https://leetcode.com/problems/validate-binary-search-tree/",
  },
  {
    title: "Sliding Window Maximum",
    difficulty: "Hard",
    categories: ["Arrays", "Algorithms"],
    description:
      "Given an array and a window size k, return the maximum value in each sliding window.",
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
      "Return all distinct solutions to the n-queens puzzle.",
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
      "Design an algorithm to serialize and deserialize a binary tree.",
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
      'Implement wildcard pattern matching with support for "?" and "*".',
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
      "Alice and Bob erase numbers from a chalkboard; return true if Alice wins assuming both play optimally.",
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
      'Write a query to find the cancellation rate of requests with unbanned users for each day between "2013-10-01" and "2013-10-03".',
    examples: [],
    link: "https://leetcode.com/problems/trips-and-users/",
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
