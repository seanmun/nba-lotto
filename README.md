# NBA Fantasy Draft Lottery Simulator

A web application that brings the excitement and fairness of the NBA Draft Lottery to fantasy sports leagues.

## Overview

This application allows fantasy league commissioners to run an authentic NBA-style lottery to determine draft order. With multi-user verification, animated lottery ball drawings, and a dramatic reveal process, this tool brings transparency and excitement to your league's draft preparation.

## Features

- **NBA-Style Lottery System**: Uses the exact same process and odds as the official NBA Draft Lottery
- **Multi-Verification System**: Requires multiple league members to verify the lottery for maximum trust
- **Animated Lottery Ball Drawing**: Visual simulation of the 4-ball lottery draw
- **Dramatic Draft Order Reveal**: Reveals picks in reverse order (from worst to best) for maximum suspense
- **Odds CSV Export**: Complete transparency with downloadable lottery combinations
- **Passwordless Authentication**: Secure email link authentication for all users

## The Math Behind the Lottery

### Lottery Mechanics

The NBA Draft Lottery uses 14 numbered ping-pong balls, drawn 4 at a time without regard to order. This creates 1,001 possible combinations:

```
Combinations = (14 choose 4) = (14! / (4! × 10!)) = 1,001
```

Since the NBA uses exactly 1,000 combinations, one combination is excluded (typically 11-12-13-14).

### Team Odds Distribution

NBA Lottery odds (as of 2023) are distributed as follows:

| Team Position | Odds for #1 Pick | Number of Combinations |
|---------------|------------------|-----------------------|
| 1st worst     | 14.0%            | 140                   |
| 2nd worst     | 14.0%            | 140                   |
| 3rd worst     | 14.0%            | 140                   |
| 4th worst     | 12.5%            | 125                   |
| 5th worst     | 10.5%            | 105                   |
| 6th worst     | 9.0%             | 90                    |
| 7th worst     | 7.5%             | 75                    |
| 8th worst     | 6.0%             | 60                    |
| 9th worst     | 4.5%             | 45                    |
| 10th worst    | 3.0%             | 30                    |
| 11th worst    | 2.0%             | 20                    |
| 12th worst    | 1.5%             | 15                    |
| 13th worst    | 1.0%             | 10                    |
| 14th worst    | 0.5%             | 5                     |

When using fewer than 14 teams, the system takes the appropriate subset of these percentages.

### Drawing Process

1. Draw four balls randomly from the 14 balls to form a combination
2. The team assigned to that combination gets the 1st pick
3. Repeat for the 2nd, 3rd, and 4th picks (redrawing if a team already selected is drawn again)
4. Remaining picks (5th onward) are assigned in reverse order of team ranking

## Getting Started

1. Register an account or log in
2. Create a new lottery and enter your league information
3. Set the number of required verifiers (including yourself)
4. Share the verification link with league members
5. Once verified, run the lottery drawing
6. Reveal the draft order dramatically from worst to best pick

## Security and Trust

The multi-verification system ensures that no single person can manipulate the lottery results. Each lottery requires a minimum number of league members to authenticate before the drawing can begin, similar to a multi-key system used for high-security applications.

## Technologies

- React with TypeScript
- Firebase Authentication and Firestore
- Tailwind CSS for styling