# App - Active Connections

This component shows the active (VPN) connections for every agent the user has access to. It displays information about the connected user, and the device. It provides sorting and searching functionality.

## Development

- Clone the repo
- Navigate to the root of the project
- Run ```npx cdk simulate active-connections```

To push changes, 
- Increase the version in the manifest.json
- Run ```npx cdk deploy active-connections```
- Test the updated version in the link provided in the terminal
- If it looks good, run ```npx cdk publish active-connections```