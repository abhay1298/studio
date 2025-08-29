'use server';

/**
 * @fileOverview Analyzes Robot Framework logs to identify root causes of errors and suggests resolutions.
 *
 * - analyzeRobotLogs - A function that handles the analysis of Robot Framework logs.
 * - AnalyzeRobotLogsInput - The input type for the analyzeRobotLogs function.
 * - AnalyzeRobotLogsOutput - The return type for the analyzeRobotLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeRobotLogsInputSchema = z.object({
  robotLogs: z
    .string()
    .describe('The content of the Robot Framework execution logs.'),
});
export type AnalyzeRobotLogsInput = z.infer<typeof AnalyzeRobotLogsInputSchema>;

const AnalyzeRobotLogsOutputSchema = z.object({
  analysisResult: z.string().describe('The analysis result including root cause and suggested resolutions.'),
});
export type AnalyzeRobotLogsOutput = z.infer<typeof AnalyzeRobotLogsOutputSchema>;

export async function analyzeRobotLogs(input: AnalyzeRobotLogsInput): Promise<AnalyzeRobotLogsOutput> {
  return analyzeRobotLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRobotLogsPrompt',
  input: {schema: AnalyzeRobotLogsInputSchema},
  output: {schema: AnalyzeRobotLogsOutputSchema},
  prompt: `You are an AI expert in analyzing Robot Framework execution logs.
  Your task is to identify the root cause of any errors present in the logs and suggest possible resolutions.
  If there are no errors, then indicate that no issues were found.

  Analyze the following Robot Framework logs:
  {{robotLogs}}
  `,
});

const analyzeRobotLogsFlow = ai.defineFlow(
  {
    name: 'analyzeRobotLogsFlow',
    inputSchema: AnalyzeRobotLogsInputSchema,
    outputSchema: AnalyzeRobotLogsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
