# GUTA Cosmetic Mobile

Expo SDK 54 application for the GUTA Cosmetic POS demo. See the repository root
`README.md` for setup, API URL configuration, and run instructions.

Start the backend on port `5000`, then run `npm run tunnel`. Metro proxies
`/api/*` to the local backend so Expo Go can access the API through the same
`exp.direct` tunnel, even when the phone is on another network.
