import { z } from 'zod';

export const ltiLaunchClaimsSchema = z.object({
  iss: z.string().url(),
  sub: z.string().min(1),
  aud: z.union([z.string(), z.array(z.string())]),
  deploymentId: z.string().min(1),
});

export type LtiLaunchClaims = z.infer<typeof ltiLaunchClaimsSchema>;

export const parseLtiLaunchClaims = (input: unknown): LtiLaunchClaims => {
  return ltiLaunchClaimsSchema.parse(input);
};
