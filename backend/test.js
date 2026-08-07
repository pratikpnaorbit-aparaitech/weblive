const fs=require("fs"),path=require("path");
for(const f of ["server.js","package.json","data.json"]){if(!fs.existsSync(path.join(__dirname,f)))throw new Error("Missing "+f)}
const db=JSON.parse(fs.readFileSync(path.join(__dirname,"data.json"),"utf8"));
if(!Array.isArray(db.users)||!Array.isArray(db.auditLogs))throw new Error("Invalid data.json");
console.log("✅ Backend validation passed");