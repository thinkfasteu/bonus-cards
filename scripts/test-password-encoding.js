"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
function testPasswordEncoding() {
    const originalUrl = process.env.DATABASE_URL;
    if (!originalUrl) {
        console.log('No DATABASE_URL found');
        return;
    }
    console.log('=== Password Encoding Test ===');
    // Extract password from URL
    const match = originalUrl.match(/postgresql:\/\/[^:]+:([^@]+)@/);
    if (match) {
        const password = match[1];
        console.log('Current password:', password);
        // URL encode special characters
        const encodedPassword = encodeURIComponent(password);
        console.log('URL-encoded password:', encodedPassword);
        if (password !== encodedPassword) {
            const newUrl = originalUrl.replace(password, encodedPassword);
            console.log('Should try URL-encoded version if auth fails');
            console.log('New URL (masked):', newUrl.replace(/(postgresql:\/\/)([^@]+)(@.+)/, '$1***$3'));
        }
        else {
            console.log('Password doesn\'t need URL encoding');
        }
    }
}
