'use server';
/**
 * @fileOverview An AI agent that analyzes Robot Framework logs and suggests performance improvements.
 *
 * - suggestPerformanceImprovementsBasedOnLogs - A function that handles the log analysis and suggestion process.
 * - SuggestPerformanceImprovementsBasedOnLogsInput - The input type for the suggestPerformanceImprovementsBasedOnLogs function.
 * - SuggestPerformanceImprovementsBasedOnLogsOutput - The return type for the suggestPerformanceImprovementsBasedOnLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPerformanceImprovementsBasedOnLogsInputSchema = z.object({
  robotFrameworkLogs: z
    .string()
    .describe('The Robot Framework execution logs to analyze.'),
});
export type SuggestPerformanceImprovementsBasedOnLogsInput = z.infer<
  typeof SuggestPerformanceImprovementsBasedOnLogsInputSchema
>;

const SuggestPerformanceImprovementsBasedOnLogsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A list of suggestions for improving the performance of the Robot Framework tests, or an explanation of why suggestions could not be made.'
    ),
});
export type SuggestPerformanceImprovementsBasedOnLogsOutput = z.infer<
  typeof SuggestPerformanceImprovementsBasedOnLogsOutputSchema
>;

export async function suggestPerformanceImprovementsBasedOnLogs(
  input: SuggestPerformanceImprovementsBasedOnLogsInput
): Promise<SuggestPerformanceImprovementsBasedOnLogsOutput> {
  return suggestPerformanceImprovementsBasedOnLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPerformanceImprovementsBasedOnLogsPrompt',
  input: {schema: SuggestPerformanceImprovementsBasedOnLogsInputSchema},
  output: {schema: SuggestPerformanceImprovementsBasedOnLogsOutputSchema},
  prompt: `You are an AI expert in Robot Framework, specializing in identifying performance bottlenecks and suggesting improvements.

  Analyze the following Robot Framework execution logs and provide a list of actionable suggestions for improving the performance of the tests. Focus on identifying slow-running tests, inefficient keyword usage, areas where parallel execution could be implemented, and any other factors impacting execution time.
  If no suggestions can be made, explain why.

  Logs:
  {{robotFrameworkLogs}}`,
});

const suggestPerformanceImprovementsBasedOnLogsFlow = ai.defineFlow(
  {
    name: 'suggestPerformanceImprovementsBasedOnLogsFlow',
    inputSchema: SuggestPerformanceImprovementsBasedOnLogsInputSchema,
    outputSchema: SuggestPerformanceImprovementsBasedOnLogsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
