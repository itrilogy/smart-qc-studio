#!/bin/sh

# Generate config.js from environment variables
cat <<EOF > /usr/share/nginx/html/config.js
window.APP_CONFIG = {
  API_KEY: "${API_KEY}",
  AI_ACTIVE_PROFILE: "${AI_ACTIVE_PROFILE}"
};
EOF

echo "Generated config.js with current environment variables."

# Execute the CMD from Dockerfile (nginx)
exec "$@"
