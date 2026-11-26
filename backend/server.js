import express from "express";
import dotenv from "dotenv";
import primaryUsers from './routes/primaryUserRoutes.js'
import secondaryUsers from './routes/secondaryUserRouters.js'
import admin from './routes/adminRoute.js'
import tally from './routes/tallyRoute.js'
 import kotRoutes from './routes/kotRoutes.js'
import qzRoutes from './routes/qzRoutes.js'

import connectDB from "./config/db.js";
import cors from 'cors'
import cookieParser from "cookie-parser";
import path from 'path'
import bodyParser from 'body-parser';



dotenv.config();
const port = process.env.PORT;
connectDB();
const corsOptions = {
  // origin: ['http://localhost:5173', 'https://erp.camet.in'],
  // origin:'https://erp.camet.in',
  origin:true,
  credentials: true,
};
  

const app = express();
app.use(express.json({ limit: '100mb',parameterLimit:50000 }));
app.use(express.urlencoded({ limit: '100mb', extended: true ,parameterLimit:50000}));
app.use(bodyParser.json({ limit: '100mb',parameterLimit:50000 }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true ,parameterLimit:50000}));
app.use(cors(corsOptions));
app.use(cookieParser())

app.use("/api/pUsers",primaryUsers)
app.use("/api/sUsers",secondaryUsers)
app.use("/api/admin",admin)
app.use("/api/tally",tally)
app.use("/api/kot", kotRoutes);
app.use("/api/qz", qzRoutes);

if(process.env.NODE_ENV==="production"){
  console.log(process.env.NODE_ENV);
  console.log("hai")
  const __dirname=path.resolve()
  const parentDir = path.join(__dirname ,'..'); 
  // const parentDir = path.join(__dirname ,); 
  console.log(parentDir)
  app.use(express.static(path.join(parentDir,'/frontend/dist')))
  app.get('*',(req,res)=>res.sendFile(path.resolve(parentDir,'frontend','dist','index.html')))
}else{
   console.log(process.env.NODE_ENV); 
app.get('/',(req,res)=>{
    res.send("Server is Ready")
})
}



app.listen(port, () => console.log(`Server started on port ${port}`));
