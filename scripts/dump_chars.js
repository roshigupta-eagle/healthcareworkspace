const fs=require('fs');
const [,,file,s,e]=process.argv;
const start=Number(s||1)-1;
const end=Number(e||start+100)-1;
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
for(let i=start;i<=end && i<lines.length;i++){
  const line=lines[i];
  const codes=line.split('').map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
  console.log(`${(i+1).toString().padStart(4,' ')}: ${lines[i]}`);
  console.log(`     ${codes}`);
}
