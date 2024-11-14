module.exports = {
    apps : [
        {
            name: "React",
            cwd: "/var/www/html/",
            script: "npm start || (rm -rf node_modules && npm install && npm run build)"
        }
    ]
}