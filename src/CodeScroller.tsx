import React, { useEffect, useRef } from 'react';

interface CodeScrollerProps {
  className?: string;
  style?: React.CSSProperties;
}

const CodeScroller: React.FC<CodeScrollerProps> = ({ className, style }) => {
  const codeLines = useRef([
    "const express = require('express');",
    "const app = express();",
    "app.get('/', (req, res) => {",
    "  res.send('Hello World!');",
    "});",
    "app.listen(3000, () => {",
    "  console.log('Server running on port 3000');",
    "});",
    "function factorial(n) {",
    "  if (n === 0) return 1;",
    "  return n * factorial(n - 1);",
    "}",
    "const sum = (a, b) => a + b;",
    "class MyClass {",
    "  constructor(name) {",
    "    this.name = name;",
    "  }",
    "  greet() {",
    "    console.log(`Hello, ${this.name}`);",
    "  }",
    "}",
    "import React from 'react';",
    "import { useState, useEffect } from 'react';",
    "function MyComponent() {",
    "  const [count, setCount] = useState(0);",
    "  useEffect(() => {",
    "    document.title = `Count: ${count}`;",
    "  }, [count]);",
    "  return (",
    "    <div>",
    "      <p>You clicked {count} times</p>",
    "      <button onClick={() => setCount(count + 1)}>",
    "        Click me",
    "      </button>",
    "    </div>",
    "  );",
    "}",
    "// This is a comment",
    "/* This is a multi-line comment */",
    "let x = 10;",
    "const y = 'hello';",
    "var z = true;",
    "if (x > 5) {",
    "  console.log('x is greater than 5');",
    "} else {",
    "  console.log('x is not greater than 5');",
    "}",
    "for (let i = 0; i < 5; i++) {",
    "  console.log(i);",
    "}",
    "while (x > 0) {",
    "  x--;",
    "}",
    "const arr = [1, 2, 3, 4, 5];",
    "arr.forEach(item => console.log(item));",
    "const newArr = arr.map(item => item * 2);",
    "const filteredArr = arr.filter(item => item % 2 === 0);",
    "const reducedValue = arr.reduce((acc, curr) => acc + curr, 0);",
    "async function fetchData() {",
    "  try {",
    "    const response = await fetch('/api/data');",
    "    const data = await response.json();",
    "    console.log(data);",
    "  } catch (error) {",
    "    console.error('Error fetching data:', error);",
    "  }",
    "}",
    "fetchData();",
    "export default MyComponent;",
    "interface User {",
    "  id: number;",
    "  name: string;",
    "  email?: string;",
    "}",
    "type Status = 'active' | 'inactive';",
    "function getUser(id: number): User {",
    "  // ... logic to get user",
    "  return { id, name: 'John Doe' };",
    "}",
    "console.log('Application started');",
    "setTimeout(() => {",
    "  console.log('Delayed message');",
    "}, 1000);",
    "setInterval(() => {",
    "  // console.log('Repeating message');",
    "}, 5000);",
  ]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ ...style, lineHeight: '1.2em' }} // Adjust line height for better spacing
    >
      <div className="animate-scroll-up whitespace-nowrap text-xs text-[#03e7f5] font-mono">
        {/* Duplicate content to ensure seamless looping */}
        {codeLines.current.map((line, index) => (
          <p key={`line-${index}`}>{line}</p>
        ))}
        {codeLines.current.map((line, index) => (
          <p key={`line-duplicate-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  );
};

export default CodeScroller;