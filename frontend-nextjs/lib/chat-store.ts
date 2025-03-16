export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  results?: any[];
  summary?: string;
  enhancedQuery?: string;
  queryType?: 'enhanced' | 'raw';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Synthetic responses based on user input
const syntheticResponses = [
  "I understand your question. Based on the information provided, I would suggest exploring the key concepts first before diving into implementation details.",
  "That's an interesting perspective. Here's what I think about it: the approach you're considering has both advantages and disadvantages. On one hand, it offers simplicity, but on the other, it might lack scalability.",
  "Let me help you with that. First, we should consider the requirements carefully, then design a solution that balances performance and maintainability.",
  "There are several ways to approach this. One effective method is to break down the problem into smaller, manageable components and tackle them one by one.",
  "I can help you with that. Here's what you need to know: the solution involves understanding the underlying principles and applying them correctly to your specific context.",
  "Based on my analysis, I would recommend a step-by-step approach that focuses on iterative development and continuous testing.",
  "Your question touches on an important topic. The key insight here is that we need to balance theoretical understanding with practical implementation.",
  "I've thought about your request, and I believe the most efficient solution would involve optimizing for both time and space complexity.",
];

export function generateSyntheticResponse(userMessage: string): string {
  const randomResponse = syntheticResponses[Math.floor(Math.random() * syntheticResponses.length)];
  
  // Add some context based on the user's message
  let contextualizedResponse = randomResponse;
  
  if (userMessage.toLowerCase().includes('help')) {
    contextualizedResponse += " I'm here to assist you with any questions or problems you have.";
  } else if (userMessage.toLowerCase().includes('example')) {
    contextualizedResponse += " For example, consider a scenario where you need to process large amounts of data efficiently.";
  } else if (userMessage.toLowerCase().includes('code')) {
    contextualizedResponse += " When writing code, it's important to focus on readability and maintainability.";
  }
  
  return contextualizedResponse;
}

export function generateChatTitle(firstMessage: string): string {
  // Create a more meaningful title based on the first few words
  const words = firstMessage.split(' ');
  const titleWords = words.slice(0, 4).join(' ');
  return titleWords + (words.length > 4 ? '...' : '');
}