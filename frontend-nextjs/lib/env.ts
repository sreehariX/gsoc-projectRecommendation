export const getEnvVar = (key: string): string => {
  const value = process.env[`NEXT_PUBLIC_${key}`] || process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

export const getGoogleAIKey = (): string => {
  return getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY');
}; 