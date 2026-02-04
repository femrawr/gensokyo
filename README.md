# gensokyo file transfer
A simple, encrypted file transfer tool.

This was just made so i could transfer files from my phone to pc, and vice versa. <br>
The frontend code is super messy and clumped together since this was made in like 1 day lmao. (still not even done)

## Featues
- keys/passwords are hashed with argon2id
- data is encrypted with aes gcm
- data is always encrypted on the client before being sent to the server

## How to use
1. go into `.server`
2. run `npm i` and wait for the dependencies to install
3. run `node src/index.js`
4. go to the url that gets outputted