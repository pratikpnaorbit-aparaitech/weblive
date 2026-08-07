
const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
const fs=require("fs");
const path=require("path");
const ExcelJS=require("exceljs");
const crypto=require("crypto");

const app=express();
const PORT=process.env.PORT||5000;
const SECRET=process.env.JWT_SECRET||"aparaitech-advanced-secret";
const PASSWORD=process.env.PORTAL_PASSWORD||"Aparaitech123@";
const STUDENT_DEFAULT_PASSWORD=process.env.STUDENT_DEFAULT_PASSWORD||"Aparaitech123@";
const LEADER_DEFAULT_USERNAME=process.env.LEADER_DEFAULT_USERNAME||"teamleader";
const LEADER_DEFAULT_PASSWORD=process.env.LEADER_DEFAULT_PASSWORD||"Leader123@";
const FILE=path.join(__dirname,"data.json");
const UPLOADS=path.join(__dirname,"uploads");
const REPORTS=path.join(__dirname,"reports");
const REPORT_FILE=path.join(REPORTS,"student_work_report.xlsx");
if(!fs.existsSync(UPLOADS))fs.mkdirSync(UPLOADS,{recursive:true});
if(!fs.existsSync(REPORTS))fs.mkdirSync(REPORTS,{recursive:true});

app.use(cors());
app.use(express.json({limit:"12mb"}));

function hashPassword(password, salt){
  if(!salt) salt=crypto.randomBytes(16).toString("hex");
  const hash=crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword){
  if(!storedPassword) return false;
  if(storedPassword.includes(":")){
    const [salt, hash]=storedPassword.split(":");
    const verifyHash=crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash===verifyHash;
  }
  return password===storedPassword;
}

function read(){
  try{
    const db = JSON.parse(fs.readFileSync(FILE,"utf8"));
    db.notes = Array.isArray(db.notes) ? db.notes : [];
    return db;
  }
  catch{return{users:[],leaders:[],auditLogs:[],notes:[]}}
}
function write(db){
  db.users=Array.isArray(db.users)?db.users:[];
  db.leaders=Array.isArray(db.leaders)?db.leaders:[];
  db.auditLogs=Array.isArray(db.auditLogs)?db.auditLogs:[];
  db.notes=Array.isArray(db.notes)?db.notes:[];
  fs.writeFileSync(FILE,JSON.stringify(db,null,2));
  queueExcelReport(db);
}
function auth(req,res,next){
  try{
    const payload = jwt.verify((req.headers.authorization||"").replace(/^Bearer\s+/i,""),SECRET);
    req.auth = payload;
    req.userId = payload.userId || payload.id;
    next();
  }catch{res.status(401).json({message:"Unauthorized or expired session."});}
}
function studentAuth(req,res,next){
  return auth(req,res,next);
}
function getUser(db,id){return db.users.find(u=>u.id===id)}

function leaderAuth(req,res,next){
  try{
    const payload=jwt.verify(
      (req.headers.authorization||"").replace(/^Bearer\s+/i,""),
      SECRET
    );
    if(payload.role!=="TEAM_LEADER" && payload.role!=="ADMIN")throw new Error("Invalid role");
    req.leader=payload;
    req.admin=payload;
    next();
  }catch{
    res.status(401).json({message:"Unauthorized team leader / admin session."});
  }
}

function adminAuth(req,res,next){
  return leaderAuth(req,res,next);
}
function cameraSummary(u){
  const history=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const totalWorkSeconds=history.reduce((sum,item)=>sum+Number(item.durationSeconds||0),0);
  const totalFocusedSeconds=history.reduce((sum,item)=>sum+Number(item.focusedSeconds||0),0);
  return{
    totalWorkSeconds,
    totalFocusedSeconds,
    averageAttentionPercent:totalWorkSeconds>0
      ?Math.round(totalFocusedSeconds/totalWorkSeconds*100)
      :0,
    proofCount:Array.isArray(u.cameraProofs)?u.cameraProofs.length:0
  };
}

function log(db,userId,action,details={}){
  db.auditLogs.push({id:"log_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),userId,action,details,createdAt:new Date().toISOString()});
  if(db.auditLogs.length>4000)db.auditLogs=db.auditLogs.slice(-4000);
}
function dayKey(date=new Date()){return date.toISOString().slice(0,10)}

function getStudentSummaryRow(u){
  normalizeUser(u);
  const assigned=u.selectedProjects||[];
  const completed=assigned.filter(id=>u.progress?.[id]?.status==="completed").length;
  const overall=assigned.length
    ?Math.round(assigned.reduce((sum,id)=>sum+Number(u.progress?.[id]?.percent||0),0)/assigned.length)
    :0;
  const cam=cameraSummary(u);
  return{
    studentId:u.id,
    username:u.username||"",
    name:u.name||"",
    email:u.email||"",
    college:u.college||"",
    chosenProjects:assigned.length,
    completedProjects:completed,
    overallProgress:overall,
    totalWorkSeconds:cam.totalWorkSeconds,
    totalFocusedSeconds:cam.totalFocusedSeconds,
    attentionPercent:cam.averageAttentionPercent,
    cameraProofs:cam.proofCount,
    lastActive:u.updatedAt||u.createdAt||"",
    createdAt:u.createdAt||""
  };
}

async function generateExcelReport(db){
  const workbook=new ExcelJS.Workbook();
  workbook.creator="Aparaitech Software";
  workbook.created=new Date();
  workbook.modified=new Date();

  const headerStyle={
    font:{bold:true,color:{argb:"FFFFFFFF"}},
    fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FF1769A4"}},
    alignment:{vertical:"middle",horizontal:"center",wrapText:true},
    border:{
      top:{style:"thin",color:{argb:"FFD3DCE7"}},
      left:{style:"thin",color:{argb:"FFD3DCE7"}},
      bottom:{style:"thin",color:{argb:"FFD3DCE7"}},
      right:{style:"thin",color:{argb:"FFD3DCE7"}}
    }
  };

  function title(sheet,text,lastColumn){
    sheet.mergeCells(`A1:${lastColumn}1`);
    const cell=sheet.getCell("A1");
    cell.value=text;
    cell.font={bold:true,size:16,color:{argb:"FFFFFFFF"}};
    cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D2F59"}};
    cell.alignment={horizontal:"center",vertical:"middle"};
    sheet.getRow(1).height=26;
  }
  function styleHeaders(sheet,row=2){
    sheet.getRow(row).eachCell(cell=>Object.assign(cell,headerStyle));
    sheet.views=[{state:"frozen",ySplit:row}];
  }
  function stripe(sheet,start=3){
    for(let r=start;r<=sheet.rowCount;r++){
      if(r%2===1){
        sheet.getRow(r).eachCell(cell=>{
          cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF3F7FB"}};
        });
      }
      sheet.getRow(r).eachCell(cell=>{
        cell.alignment={vertical:"top",wrapText:true};
        cell.border={
          top:{style:"thin",color:{argb:"FFE5E7EB"}},
          left:{style:"thin",color:{argb:"FFE5E7EB"}},
          bottom:{style:"thin",color:{argb:"FFE5E7EB"}},
          right:{style:"thin",color:{argb:"FFE5E7EB"}}
        };
      });
    }
  }

  const students=(db.users||[]).map(getStudentSummaryRow);

  const summary=workbook.addWorksheet("Student Summary");
  title(summary,"APARAITECH SOFTWARE - STUDENT WORK REPORT","O");
  summary.addRow(["Student ID","Username","Student Name","Email","College","Chosen Projects","Completed Projects","Overall Progress %","Total Work Seconds","Focused Seconds","Attention %","Camera Proofs","Last Active","Created At","Report Status"]);
  students.forEach(s=>summary.addRow([
    s.studentId,s.username,s.name,s.email,s.college,s.chosenProjects,s.completedProjects,
    s.overallProgress,s.totalWorkSeconds,s.totalFocusedSeconds,s.attentionPercent,s.cameraProofs,
    s.lastActive,s.createdAt,s.chosenProjects===4?"Projects Locked":"Awaiting Selection"
  ]));
  styleHeaders(summary);stripe(summary);
  summary.columns=[
    {width:20},{width:18},{width:24},{width:28},{width:24},{width:15},{width:17},
    {width:18},{width:18},{width:17},{width:14},{width:14},{width:23},{width:23},{width:20}
  ];

  const projects=workbook.addWorksheet("Project Progress");
  title(projects,"PROJECT PROGRESS","L");
  projects.addRow(["Student Username","Student Name","Project Order","Project ID","Project Name","Status","Completed Chapters","Total Chapters","Progress %","Quiz","GitHub URL","Tracked Time Seconds"]);
  for(const u of db.users||[]){
    normalizeUser(u);
    (u.selectedProjects||[]).forEach((id,index)=>{
      const p=u.progress?.[id]||{};
      projects.addRow([
        u.username||"",u.name||"",index+1,id,id,p.status||"locked",
        (p.completedChapters||[]).length,16,p.percent||0,
        p.quizPassed?`Passed (${p.quizScore||100}%)`:"Pending",
        p.githubUrl||"",p.timeSpentSeconds||0
      ]);
    });
  }
  styleHeaders(projects);stripe(projects);
  projects.columns=[{width:18},{width:24},{width:14},{width:22},{width:24},{width:20},{width:20},{width:15},{width:14},{width:18},{width:38},{width:20}];

  const activity=workbook.addWorksheet("Daily Activity");
  title(activity,"DAILY ACTIVITY","E");
  activity.addRow(["Student Username","Student Name","Date","Work Seconds","Work Hours"]);
  for(const u of db.users||[]){
    for(const [date,seconds] of Object.entries(u.dailyActivity||{})){
      activity.addRow([u.username||"",u.name||"",date,Number(seconds||0),Number(seconds||0)/3600]);
    }
  }
  styleHeaders(activity);stripe(activity);
  activity.getColumn(5).numFmt="0.00";
  activity.columns=[{width:18},{width:24},{width:15},{width:18},{width:14}];

  const camera=workbook.addWorksheet("Camera Sessions");
  title(camera,"CAMERA WORK SESSIONS","J");
  camera.addRow(["Student Username","Student Name","Project ID","Chapter","Started At","Stopped At","Duration Seconds","Focused Seconds","Attention %","Status"]);
  for(const u of db.users||[]){
    for(const item of u.cameraWorkHistory||[]){
      camera.addRow([
        u.username||"",u.name||"",item.projectId||"",item.chapterIndex??"",
        item.startedAt||"",item.stoppedAt||"",item.durationSeconds||0,
        item.focusedSeconds||0,item.attentionPercent||0,item.active?"Active":"Completed"
      ]);
    }
  }
  styleHeaders(camera);stripe(camera);
  camera.columns=[{width:18},{width:24},{width:22},{width:12},{width:23},{width:23},{width:18},{width:18},{width:14},{width:14}];

  const proofs=workbook.addWorksheet("Camera Proofs");
  title(proofs,"CAMERA PROOFS","H");
  proofs.addRow(["Student Username","Student Name","Project ID","Chapter","Proof Type","Captured At","File","Proof ID"]);
  for(const u of db.users||[]){
    for(const proof of u.cameraProofs||[]){
      proofs.addRow([
        u.username||"",u.name||"",proof.projectId||"",proof.chapterIndex??"",
        proof.type||"",proof.capturedAt||"",proof.file||"",proof.id||""
      ]);
    }
  }
  styleHeaders(proofs);stripe(proofs);
  proofs.columns=[{width:18},{width:24},{width:22},{width:12},{width:16},{width:23},{width:38},{width:24}];

  await workbook.xlsx.writeFile(REPORT_FILE);
  return REPORT_FILE;
}

function queueExcelReport(db){
  setTimeout(()=>{
    generateExcelReport(JSON.parse(JSON.stringify(db))).catch(error=>{
      console.error("Excel report generation failed:",error.message);
    });
  },20);
}

function normalizeUser(u){
  u.role=u.role||"STUDENT";
  u.department=u.department||"Computer Science";
  u.year=u.year||"Final Year";
  u.selectedProjects=Array.isArray(u.selectedProjects)?u.selectedProjects:[];
  u.progress=u.progress&&typeof u.progress==="object"?u.progress:{};
  u.dailyActivity=u.dailyActivity&&typeof u.dailyActivity==="object"?u.dailyActivity:{};

  const assigned=u.selectedProjects;
  const completed=assigned.filter(id=>u.progress?.[id]?.status==="completed").length;
  if(!u.status){
    if(assigned.length===4 && completed===4) u.status="completed";
    else if(assigned.length>0) u.status="active";
    else u.status="pending";
  }

  for(const id of u.selectedProjects){
    u.progress[id]=u.progress[id]||{};
    const p=u.progress[id];
    p.status=p.status||"locked";
    p.completedChapters=Array.isArray(p.completedChapters)?p.completedChapters:[];
    p.percent=Number(p.percent||0);
    p.githubUrl=p.githubUrl||"";
    p.submissionNote=p.submissionNote||"";
    p.submittedAt=p.submittedAt||null;
    p.timeSpentSeconds=Number(p.timeSpentSeconds||0);
    p.activeStartedAt=p.activeStartedAt||null;
    p.quizPassed=Boolean(p.quizPassed);
    p.quizScore=Number(p.quizScore||0);
  }
  return u;
}

app.get("/",(_,res)=>res.json({success:true,service:"Aparaitech Advanced Tracking Backend"}));
app.get("/api/health",(_,res)=>res.json({success:true,status:"healthy",timestamp:new Date().toISOString()}));


app.post("/api/auth/student-login",(req,res)=>{
  const{username,password,login}=req.body||{};
  const userQuery = String(login || username || "").trim();
  if(!userQuery||!password)return res.status(400).json({message:"Username/Email and password are required."});
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  const queryLower = userQuery.toLowerCase();
  let u=db.users.find(item=>
    String(item.username||"").toLowerCase()===queryLower ||
    String(item.email||"").toLowerCase()===queryLower ||
    String(item.name||"").toLowerCase()===queryLower
  );
  if(!u && (password === STUDENT_DEFAULT_PASSWORD || password === PASSWORD || password === "Aparitech123@" || password === "Aparaitech123@")){
    u = {
      id:"usr_"+Date.now(),
      name:userQuery,
      username:userQuery,
      email:userQuery.includes("@")?userQuery.toLowerCase():`${userQuery.toLowerCase()}@aparaitech.local`,
      password:hashPassword(password),
      college:"",
      department:"Computer Science",
      year:"Final Year",
      status:"pending",
      role:"STUDENT",
      selectedProjects:[],
      progress:{},
      dailyActivity:{},
      cameraProofs:[],
      cameraWorkHistory:[],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    db.users.push(u);
    log(db,u.id,"STUDENT_AUTO_REGISTERED",{username:u.username});
  }
  const passToVerify = u?.password || STUDENT_DEFAULT_PASSWORD;
  if(!u||!verifyPassword(password, passToVerify)){
    return res.status(401).json({message:"Invalid student username or password."});
  }
  if(!u.password || !u.password.includes(":")){
    u.password = hashPassword(password);
  }
  normalizeUser(u);
  log(db,u.id,"STUDENT_LOGIN",{username:u.username});
  write(db);
  const token=jwt.sign({userId:u.id,role:"STUDENT"},SECRET,{expiresIn:"7d"});
  const safe={...u};delete safe.password;
  res.json({token,role:"STUDENT",user:safe});
});

app.post("/api/auth/leader-login",(req,res)=>{
  const{username,password,login}=req.body||{};
  const userQuery = String(login || username || "").trim();
  const db=read();
  db.leaders=Array.isArray(db.leaders)?db.leaders:[];
  if(!db.leaders.length){
    db.leaders.push({
      id:"leader_default",
      username:LEADER_DEFAULT_USERNAME,
      email:"admin@aparaitech.com",
      password:hashPassword(LEADER_DEFAULT_PASSWORD),
      name:"Team Leader Admin",
      role:"ADMIN"
    });
    write(db);
  }
  const queryLower = userQuery.toLowerCase();
  const leader=db.leaders.find(item=>
    String(item.username||"").toLowerCase()===queryLower ||
    String(item.email||"").toLowerCase()===queryLower
  );
  if(!leader||!verifyPassword(password, leader.password)){
    return res.status(401).json({message:"Invalid team leader/admin username or password."});
  }
  if(!leader.password.includes(":")){
    leader.password = hashPassword(password);
    write(db);
  }
  const token=jwt.sign({leaderId:leader.id,role:"ADMIN"},SECRET,{expiresIn:"7d"});
  res.json({token,role:"ADMIN",leader:{id:leader.id,username:leader.username,name:leader.name,email:leader.email}});
});

app.post("/api/auth/login",(req,res)=>{
  const{login,username,email,password,name,college=""}=req.body||{};
  const userQuery = String(login || username || email || "").trim();

  // If candidate quick register fallback without password
  if(password === PASSWORD && (name || email)) {
    const db=read(),normalized=(email||login).toLowerCase().trim();
    let u=db.users.find(x=>x.email===normalized || x.username===normalized || x.name===normalized);
    if(!u){
      u={id:"usr_"+Date.now(),name:name?name.trim():"Intern",email:normalized,username:normalized.split("@")[0],password:hashPassword(STUDENT_DEFAULT_PASSWORD),college:college.trim(),selectedProjects:[],progress:{},dailyActivity:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      db.users.push(u);log(db,u.id,"CANDIDATE_CREATED");
    } else {
      if(name) u.name=name.trim();
      u.updatedAt=new Date().toISOString();log(db,u.id,"LOGIN");
    }
    normalizeUser(u);write(db);
    const token=jwt.sign({userId:u.id,role:"STUDENT"},SECRET,{expiresIn:"7d"});
    const safe={...u};delete safe.password;
    return res.json({token,role:"STUDENT",user:safe});
  }

  if(!userQuery || !password){
    return res.status(400).json({message:"Email or Username and Password are required."});
  }

  const db = read();
  db.leaders = Array.isArray(db.leaders)?db.leaders:[];
  db.users = Array.isArray(db.users)?db.users:[];

  if(!db.leaders.length){
    db.leaders.push({
      id:"leader_default",
      username:LEADER_DEFAULT_USERNAME,
      email:"admin@aparaitech.com",
      password:hashPassword(LEADER_DEFAULT_PASSWORD),
      name:"Team Leader Admin",
      role:"ADMIN"
    });
    write(db);
  }

  const queryLower = userQuery.toLowerCase();

  // 1. Check Admin / Leader
  const leader = db.leaders.find(l =>
    String(l.username||"").toLowerCase() === queryLower ||
    String(l.email||"").toLowerCase() === queryLower ||
    queryLower === "admin@aparaitech.com" ||
    queryLower === "teamleader" ||
    queryLower === "admin"
  );
  if(leader && verifyPassword(password, leader.password)){
    if(!leader.password.includes(":")){
      leader.password = hashPassword(password);
    }
    const token = jwt.sign({leaderId:leader.id, role:"ADMIN"}, SECRET, {expiresIn:"7d"});
    log(db, leader.id, "ADMIN_LOGIN", {username: leader.username});
    write(db);
    return res.json({
      token,
      role:"ADMIN",
      user:{id:leader.id, username:leader.username, name:leader.name, email:leader.email||"admin@aparaitech.com", role:"ADMIN"}
    });
  }

  // 2. Check Student
  let student = db.users.find(u =>
    String(u.username||"").toLowerCase() === queryLower ||
    String(u.email||"").toLowerCase() === queryLower ||
    String(u.name||"").toLowerCase() === queryLower
  );

  // If student is not registered yet, auto-register student on first login
  if (!student) {
    const cleanUser = userQuery.includes("@") ? userQuery.split("@")[0] : userQuery;
    student = {
      id: "usr_" + Date.now(),
      name: cleanUser,
      username: cleanUser,
      email: userQuery.includes("@") ? userQuery.toLowerCase() : `${userQuery.toLowerCase()}@aparaitech.local`,
      password: hashPassword(password),
      college: "",
      department: "Computer Science",
      year: "Final Year",
      status: "pending",
      role: "STUDENT",
      selectedProjects: [],
      progress: {},
      dailyActivity: {},
      cameraProofs: [],
      cameraWorkHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(student);
    log(db, student.id, "STUDENT_AUTO_REGISTERED", { username: student.username });
  }

  const passToVerify = student.password || STUDENT_DEFAULT_PASSWORD;
  if(!student.password || verifyPassword(password, passToVerify) || password === STUDENT_DEFAULT_PASSWORD || password === PASSWORD || password === "Aparitech123@" || password === "Aparaitech123@"){
    if(!student.password || !student.password.includes(":")){
      student.password = hashPassword(password);
    }
    normalizeUser(student);
    log(db, student.id, "STUDENT_LOGIN", {username: student.username});
    write(db);
    const token = jwt.sign({userId:student.id, role:"STUDENT"}, SECRET, {expiresIn:"7d"});
    const safe = {...student}; delete safe.password;
    return res.json({token, role:"STUDENT", user:safe});
  }

  return res.status(401).json({message:"Invalid Email/Username or Password."});
});

app.post("/api/leader/students",leaderAuth,(req,res)=>{
  const{name,username,email="",college="",department="Computer Science",year="Final Year"}=req.body||{};
  if(!name||!username)return res.status(400).json({message:"Student name and username are required."});
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  if(db.users.some(u=>String(u.username||"").toLowerCase()===String(username).toLowerCase())){
    return res.status(409).json({message:"Student username already exists."});
  }
  const student={
    id:"usr_"+Date.now(),
    name:String(name).trim(),
    username:String(username).trim(),
    password:hashPassword(STUDENT_DEFAULT_PASSWORD),
    email:String(email).trim().toLowerCase(),
    college:String(college).trim(),
    department:String(department).trim(),
    year:String(year).trim(),
    status:"pending",
    role:"STUDENT",
    selectedProjects:[],
    progress:{},
    dailyActivity:{},
    cameraProofs:[],
    cameraWorkHistory:[],
    createdBy: req.leader.leaderId,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  db.users.push(student);
  log(db,student.id,"STUDENT_ACCOUNT_CREATED",{username:student.username,leaderId:req.leader.leaderId});
  write(db);
  const safe={...student};delete safe.password;
  res.json({message:"Student account created.",student:safe,defaultPassword:STUDENT_DEFAULT_PASSWORD});
});

app.get("/api/leader/excel-preview",leaderAuth,async(req,res)=>{
  const db=read();
  const rows=(db.users||[]).map(getStudentSummaryRow);
  await generateExcelReport(db);
  res.json({
    generatedAt:new Date().toISOString(),
    rows
  });
});

app.get("/api/leader/report.xlsx",leaderAuth,async(req,res)=>{
  const db=read();
  await generateExcelReport(db);
  res.download(REPORT_FILE,"Aparaitech_Student_Work_Report.xlsx");
});

app.get("/api/leader/students",leaderAuth,(req,res)=>{
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  const students=db.users.map(u=>{
    normalizeUser(u);
    const safe={...u,cameraSummary:cameraSummary(u)};
    delete safe.password;
    return safe;
  });
  res.json({students});
});

// ADMIN PANEL ENDPOINTS
app.get("/api/admin/students", adminAuth, (req, res) => {
  const db = read();
  db.users = Array.isArray(db.users) ? db.users : [];
  const { q = "", department = "", year = "", project = "", status = "" } = req.query;

  let students = db.users.map(u => {
    normalizeUser(u);
    const assigned = u.selectedProjects || [];
    const completed = assigned.filter(id => u.progress?.[id]?.status === "completed").length;
    const overall = assigned.length
      ? Math.round(assigned.reduce((sum, id) => sum + Number(u.progress?.[id]?.percent || 0), 0) / assigned.length)
      : 0;
    const safe = { ...u, cameraSummary: cameraSummary(u), overallProgress: overall, completedProjectsCount: completed };
    delete safe.password;
    return safe;
  });

  if (q) {
    const query = String(q).toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.username && s.username.toLowerCase().includes(query)) ||
      (s.college && s.college.toLowerCase().includes(query))
    );
  }
  if (department) {
    students = students.filter(s => String(s.department).toLowerCase() === String(department).toLowerCase());
  }
  if (year) {
    students = students.filter(s => String(s.year).toLowerCase() === String(year).toLowerCase());
  }
  if (project) {
    students = students.filter(s => (s.selectedProjects || []).includes(project));
  }
  if (status) {
    students = students.filter(s => String(s.status).toLowerCase() === String(status).toLowerCase());
  }

  res.json({ students });
});

app.get("/api/admin/stats", adminAuth, (req, res) => {
  const db = read();
  db.users = Array.isArray(db.users) ? db.users : [];
  const totalStudents = db.users.length;
  const totalProjects = 10;

  let activeStudents = 0;
  let completedStudents = 0;
  let pendingStudents = 0;

  const departmentCounts = {};
  const projectDistribution = {};

  db.users.forEach(u => {
    normalizeUser(u);
    const st = u.status || "pending";
    if (st === "completed") completedStudents++;
    else if (st === "active") activeStudents++;
    else pendingStudents++;

    const dept = u.department || "Computer Science";
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

    (u.selectedProjects || []).forEach(pId => {
      projectDistribution[pId] = (projectDistribution[pId] || 0) + 1;
    });
  });

  res.json({
    totalStudents,
    totalProjects,
    activeStudents,
    completedStudents,
    pendingStudents,
    departmentCounts,
    projectDistribution
  });
});

app.get("/api/admin/students/:id", adminAuth, (req, res) => {
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  normalizeUser(u);
  const safe = { ...u, cameraSummary: cameraSummary(u) };
  delete safe.password;
  const studentLogs = (db.auditLogs || []).filter(l => l.userId === u.id).slice(-100).reverse();
  res.json({ student: safe, logs: studentLogs });
});

app.put("/api/admin/students/:id/status", adminAuth, (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ message: "Status is required." });
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  u.status = status;
  u.updatedAt = new Date().toISOString();
  log(db, u.id, "ADMIN_CHANGE_STATUS", { status, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  normalizeUser(u);
  const safe = { ...u };
  delete safe.password;
  res.json({ message: "Student status updated.", student: safe });
});

app.put("/api/admin/students/:id/progress", adminAuth, (req, res) => {
  const { projectId, percent, status } = req.body || {};
  if (!projectId) return res.status(400).json({ message: "projectId is required." });
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  normalizeUser(u);
  if (!u.progress[projectId]) {
    return res.status(404).json({ message: "Project not selected by this student." });
  }
  if (typeof percent === "number") {
    u.progress[projectId].percent = Math.min(100, Math.max(0, percent));
    const completedCount = Math.round((u.progress[projectId].percent / 100) * 16);
    u.progress[projectId].completedChapters = Array.from({ length: completedCount }, (_, i) => i);
    if(u.progress[projectId].percent === 100 && u.progress[projectId].status !== "completed") {
      u.progress[projectId].status = "ready_for_submission";
    }
  }
  if (status) {
    u.progress[projectId].status = status;
  }
  u.updatedAt = new Date().toISOString();
  log(db, u.id, "ADMIN_UPDATE_PROGRESS", { projectId, percent, status, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  const safe = { ...u };
  delete safe.password;
  res.json({ message: "Student project progress updated.", student: safe });
});

app.delete("/api/admin/students/:id", adminAuth, (req, res) => {
  const db = read();
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Student not found." });
  const removed = db.users.splice(index, 1)[0];
  log(db, req.params.id, "ADMIN_DELETE_STUDENT", { username: removed.username, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  res.json({ message: "Student account deleted successfully." });
});

app.get("/api/intern/me",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  normalizeUser(u);write(db);res.json({user:u});
});

app.post("/api/intern/selection",auth,(req,res)=>{
  const ids=req.body?.projectIds;
  if(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4){
    return res.status(400).json({message:"Exactly 4 unique projects must be selected."});
  }
  const db=read(),u=getUser(db,req.auth.userId);
  normalizeUser(u);
  if((u.selectedProjects||[]).length===4){
    return res.status(409).json({
      message:"Your four projects are already selected and cannot be changed.",
      user:u
    });
  }
  u.selectedProjects=ids;
  u.progress={};
  ids.forEach((id,index)=>{
    u.progress[id]={
      status:index===0?"available":"locked",
      completedChapters:[],
      percent:0,
      githubUrl:"",
      submissionNote:"",
      submittedAt:null,
      timeSpentSeconds:0,
      activeStartedAt:null,
      quizPassed:false,
      quizScore:0
    };
  });
  log(db,u.id,"STUDENT_PROJECT_SELECTION_LOCKED",{projectIds:ids});
  write(db);
  res.json({user:u,message:"Four projects selected and locked successfully."});
});

app.post("/api/tracking/:id/start",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked. Complete the previous project."});
  if(!p.activeStartedAt)p.activeStartedAt=new Date().toISOString();
  log(db,u.id,"TRACKING_STARTED",{projectId:req.params.id});write(db);res.json({message:"Tracking started."});
});

app.post("/api/tracking/:id/stop",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.activeStartedAt){
    const seconds=Math.max(0,Math.floor((Date.now()-new Date(p.activeStartedAt).getTime())/1000));
    p.timeSpentSeconds+=seconds;
    const key=dayKey();
    u.dailyActivity[key]=Number(u.dailyActivity[key]||0)+seconds;
    p.activeStartedAt=null;
    log(db,u.id,"TRACKING_STOPPED",{projectId:req.params.id,seconds,total:p.timeSpentSeconds});
    write(db);
  }
  res.json({timeSpentSeconds:p.timeSpentSeconds,dailyActivity:u.dailyActivity});
});

app.post("/api/projects/:id/chapters/:chapter",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked."});
  const chapter=Number(req.params.chapter);
  if(!Number.isInteger(chapter)||chapter<0||chapter>=16)return res.status(400).json({message:"Invalid chapter."});
  if(!p.completedChapters.includes(chapter))p.completedChapters.push(chapter);
  p.completedChapters.sort((a,b)=>a-b);
  p.percent=Math.min(100,Math.round(p.completedChapters.length/16*100));
  if(p.percent===100)p.status="ready_for_submission";
  log(db,u.id,"CHAPTER_COMPLETED",{projectId:req.params.id,chapter,percent:p.percent});
  write(db);res.json({progress:p});
});

app.post("/api/projects/:id/quiz",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked."});
  const passed=req.body?.answer==="backend";
  p.quizPassed=passed;p.quizScore=passed?100:0;
  log(db,u.id,"QUIZ_ATTEMPT",{projectId:req.params.id,passed,score:p.quizScore});
  write(db);
  if(!passed)return res.status(400).json({message:"Quiz not passed. Review security and try again."});
  res.json({message:"Quiz passed successfully.",quizScore:p.quizScore});
});

app.post("/api/projects/:id/submit",auth,(req,res)=>{
  const{githubUrl,submissionNote=""}=req.body||{};
  if(!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(githubUrl||""))return res.status(400).json({message:"Enter a valid GitHub repository URL."});
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.percent<100)return res.status(400).json({message:"Complete all chapters before submission."});
  if(!p.quizPassed)return res.status(400).json({message:"Pass the quiz before submission."});
  p.githubUrl=githubUrl;p.submissionNote=submissionNote.trim();p.submittedAt=new Date().toISOString();p.status="completed";
  const i=u.selectedProjects.indexOf(req.params.id);
  if(i>=0&&i<u.selectedProjects.length-1)u.progress[u.selectedProjects[i+1]].status="available";
  log(db,u.id,"PROJECT_SUBMITTED",{projectId:req.params.id,githubUrl});
  write(db);res.json({message:"Project submitted successfully. Next project unlocked.",user:u});
});



app.post("/api/work-proof",auth,(req,res)=>{
  const{projectId=null,chapterIndex=null,type="manual",capturedAt,imageData}=req.body||{};
  const match=String(imageData||"").match(/^data:image\/jpeg;base64,(.+)$/);
  if(!match)return res.status(400).json({message:"Valid JPEG camera image is required."});

  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});

  const filename=`proof_${u.id}_${Date.now()}.jpg`;
  fs.writeFileSync(path.join(UPLOADS,filename),Buffer.from(match[1],"base64"));

  u.cameraProofs=Array.isArray(u.cameraProofs)?u.cameraProofs:[];
  const proof={
    id:"proof_"+Date.now(),
    projectId,
    chapterIndex,
    type,
    capturedAt:capturedAt||new Date().toISOString(),
    file:`uploads/${filename}`
  };
  u.cameraProofs.push(proof);
  if(u.cameraProofs.length>200)u.cameraProofs=u.cameraProofs.slice(-200);
  log(db,u.id,"CAMERA_PROOF_CAPTURED",{projectId,chapterIndex,type,file:proof.file});
  write(db);
  res.json({message:"Camera proof stored successfully.",proof});
});



app.get("/api/camera-work/summary",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  const history=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const totalWorkSeconds=history.reduce((sum,item)=>sum+Number(item.durationSeconds||0),0);
  const totalFocusedSeconds=history.reduce((sum,item)=>sum+Number(item.focusedSeconds||0),0);
  const averageAttentionPercent=totalWorkSeconds>0
    ? Math.round(totalFocusedSeconds/totalWorkSeconds*100)
    : 0;
  res.json({
    totalSessions:history.length,
    totalWorkSeconds,
    totalFocusedSeconds,
    averageAttentionPercent
  });
});

app.post("/api/camera-work/start",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  u.cameraWorkSession={
    active:true,
    startedAt:new Date().toISOString(),
    projectId:req.body?.projectId||null,
    chapterIndex:req.body?.chapterIndex??null
  };
  log(db,u.id,"CAMERA_WORK_STARTED",u.cameraWorkSession);
  write(db);
  res.json({message:"Camera work session started.",session:u.cameraWorkSession});
});

app.post("/api/camera-work/stop",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  const durationSeconds=Math.max(0,Number(req.body?.durationSeconds||0));
  const focusedSeconds=Math.min(
    durationSeconds,
    Math.max(0,Number(req.body?.focusedSeconds||0))
  );
  const attentionPercent=durationSeconds>0
    ? Math.round(focusedSeconds/durationSeconds*100)
    : 0;
  u.cameraWorkHistory=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const session={
    ...(u.cameraWorkSession||{}),
    active:false,
    stoppedAt:new Date().toISOString(),
    durationSeconds,
    focusedSeconds,
    attentionPercent,
    projectId:req.body?.projectId || u.cameraWorkSession?.projectId || null,
    chapterIndex:req.body?.chapterIndex ?? u.cameraWorkSession?.chapterIndex ?? null
  };
  u.cameraWorkHistory.push(session);
  if(u.cameraWorkHistory.length>500)u.cameraWorkHistory=u.cameraWorkHistory.slice(-500);
  u.cameraWorkSession=null;
  log(db,u.id,"CAMERA_WORK_STOPPED",{
    durationSeconds,
    focusedSeconds,
    attentionPercent,
    projectId:session.projectId,
    chapterIndex:session.chapterIndex
  });
  write(db);
  res.json({message:"Camera work session saved.",session});
});

// INTERNSHIP NOTES API ENDPOINTS

// 1. Student: Save or Update Chapter Note
app.post("/api/notes", studentAuth, (req, res) => {
  const { projectId, chapterId, notes, chapterName = "" } = req.body || {};
  if (!projectId || chapterId === undefined || chapterId === null) {
    return res.status(400).json({ message: "projectId and chapterId are required." });
  }
  const db = read();
  const student = db.users.find(u => u.id === req.userId);
  if (!student) return res.status(404).json({ message: "Student not found." });

  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const chapIdx = Number(chapterId);
  const now = new Date().toISOString();

  let noteEntry = db.notes.find(n => n.studentId === student.id && n.projectId === projectId && Number(n.chapterId) === chapIdx);

  if (noteEntry) {
    noteEntry.notes = String(notes || "").trim();
    noteEntry.updatedAt = now;
    if (chapterName) noteEntry.chapterName = chapterName;
  } else {
    noteEntry = {
      id: "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      studentId: student.id,
      studentName: student.name || student.username || "Student",
      studentEmail: student.email || "",
      projectId,
      chapterId: chapIdx,
      chapterName: chapterName || `Chapter ${chapIdx + 1}`,
      notes: String(notes || "").trim(),
      createdAt: now,
      updatedAt: now
    };
    db.notes.push(noteEntry);
  }

  log(db, student.id, "STUDENT_SAVE_NOTES", { projectId, chapterId: chapIdx });
  write(db);
  res.json({ message: "Intern notes saved successfully.", note: noteEntry });
});

// 2. Student: Get own notes (with optional search/filter params)
app.get("/api/notes", studentAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { projectId, chapterId, q } = req.query || {};

  let list = db.notes.filter(n => n.studentId === req.userId);

  if (projectId) list = list.filter(n => n.projectId === projectId);
  if (chapterId !== undefined && chapterId !== null && chapterId !== "") {
    list = list.filter(n => Number(n.chapterId) === Number(chapterId));
  }
  if (q) {
    const query = String(q).toLowerCase().trim();
    list = list.filter(n =>
      n.notes.toLowerCase().includes(query) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(query)) ||
      n.projectId.toLowerCase().includes(query)
    );
  }

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ notes: list });
});

// 3. Student: Get single note for a specific chapter
app.get("/api/notes/:projectId/:chapterId", studentAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { projectId, chapterId } = req.params;
  const note = db.notes.find(n => n.studentId === req.userId && n.projectId === projectId && Number(n.chapterId) === Number(chapterId));
  res.json({ note: note || null });
});

// 4. Admin: View all student notes (Read-Only)
app.get("/api/admin/notes", adminAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { q, projectId, studentId } = req.query || {};

  let list = [...db.notes];

  if (studentId) list = list.filter(n => n.studentId === studentId);
  if (projectId) list = list.filter(n => n.projectId === projectId);
  if (q) {
    const query = String(q).toLowerCase().trim();
    list = list.filter(n =>
      (n.studentName && n.studentName.toLowerCase().includes(query)) ||
      (n.studentEmail && n.studentEmail.toLowerCase().includes(query)) ||
      (n.notes && n.notes.toLowerCase().includes(query)) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(query)) ||
      (n.projectId && n.projectId.toLowerCase().includes(query))
    );
  }

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ total: list.length, notes: list });
});

app.get("/api/admin/candidates",(req,res)=>{
  if(req.headers["x-admin-password"]!==PASSWORD)return res.status(401).json({message:"Invalid admin password."});
  const db=read();res.json({total:db.users.length,candidates:db.users,auditLogs:db.auditLogs.slice(-200).reverse()});
});

const server = app.listen(PORT,()=>console.log(`🚀 Backend running on http://localhost:${PORT}`))
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is currently occupied by another process. Kill process on port ${PORT} or run: npx kill-port ${PORT}`);
    } else {
      console.error("Server error:", err);
    }
  });
