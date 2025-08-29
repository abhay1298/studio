'use server';

/**
 * @fileOverview A flow to handle sending a welcome email to a new user.
 *
 * - sendWelcomeEmail - Simulates sending a welcome email upon registration.
 * - WelcomeEmailInput - The input type for the sendWelcomeEmail function.
 * - WelcomeEmailOutput - The return type for the sendWelcomeEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WelcomeEmailInputSchema = z.object({
  name: z.string().describe('The name of the new user.'),
  email: z.string().email().describe('The email address of the new user.'),
});
export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

const WelcomeEmailOutputSchema = z.object({
  message: z.string().describe('A confirmation message indicating the result.'),
});
export type WelcomeEmailOutput = z.infer<typeof WelcomeEmailOutputSchema>;

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<WelcomeEmailOutput> {
  return sendWelcomeEmailFlow(input);
}

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: WelcomeEmailInputSchema,
    outputSchema: WelcomeEmailOutputSchema,
  },
  async (input) => {
    console.log(`Simulating sending a welcome email to ${input.name} at ${input.email}`);

    // In a real application, you would integrate with an email service like SendGrid, Mailgun, or AWS SES here.
    // The AI could be used to generate a personalized welcome message.
    // For now, we will just return a success message.
    
    // const personalizedMessage = await ai.generate({
    //   prompt: `Generate a short, friendly welcome message for a new user named ${input.name} who just signed up for "Robot Maestro".`
    // });

    return {
      message: `A welcome email has been sent to ${input.email}.`,
    };
  }
);
