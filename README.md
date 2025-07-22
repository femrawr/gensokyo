# Gensokyo
A simple app to transfer files from your phone to your pc

## How to use
1. Install [Node JS](https://nodejs.org/en)
2. Clone the repo: `git clone https://github.com/femrawr/gensokyo`
    you can alternatively download the project manually:
    - go to the top right of the repo
    - click the green `<> Code v` button
    - click on `Download ZIP`
    - extract the file
3. go into the folder downloaded
4. run `node server.js` to start the server
5. now you can go to the address outputted and transfer your files

## Deleting files securely
you can goto `/shred/<file name>` to delete a file

e.g. you have a file in `/_uploaded` called `balls.png`, you can delete it securely by going to `http://<your ip>:<port>/shred/balls.png`
