const { exec } = require('child_process');
const fs = require('node:fs');

const command = 'df -h';

setInterval(() => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`Error executing command: ${error.message}`);
            if (stderr)  console.log(`stderr: ${stderr}`);
        }
        if (stderr)  console.log(`stderr: ${stderr}`);

        let message = `${new Date()}\n${stdout}\n\n`;
        fs.writeFile('./log.txt', message, { flag: 'a+' }, err => {if (err) console.error(err)});
    });
},60000*60);