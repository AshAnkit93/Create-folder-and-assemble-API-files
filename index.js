const express=require('express');
const app=express();
const path=require('path');
const router=express.Router();
const bodyParser=require('body-parser');
const { urlencoded } = require('express');
const fs=require('fs');
const { classicNameResolver } = require('typescript');
const { Console } = require('console');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());


function getClassName(content){
    content=content.replace(/`/g,'');
    var t1=content.indexOf('(');
    var s1=content.substring(0,t1);
    var className = s1.substring(s1.indexOf('TABLE')+5,s1.length-1).trim();
    return className;
}

//Module
function createModuleContent(fname,fCont){
    let tableName=getClassName(fCont);
    let finalString='import { Module } from "@nestjs/common";\n'
    finalString +='import { TypeOrmModule } from "@nestjs/typeorm";\n'
    finalString +='import { '+tableName+' } from "src/database/entites/'+fname+'.entity";\n'
    finalString +='import { '+tableName+'Service } from "./'+fname+'.service";\n'
    finalString +='import { '+tableName+'Controller } from "./'+fname+'.controller";\n\n'
    finalString +='@Module ({\nimports:[TypeOrmModule.forFeature(['+tableName+'])],\ncontrollers:['+tableName+'Controller],\nproviders:['+tableName+'Service] })\n\n';
    finalString +='export class '+tableName+'Module{}\n';

    return finalString;
}

function createControllerContent(fname,fCont)
{
    let tableName=getClassName(fCont);
    let serviceName = tableName+'Service';

    let finalString='import { Body, Controller, Get, Post, Delete, Param, Put } from "@nestjs/common";\n'
    finalString+='import { '+tableName+' } from "src/database/entites/'+fname+'.entity";\n'
    finalString+='import { '+tableName+'Service } from "./'+fname+'.service";\n\n'
    
    finalString+='@Controller("/'+tableName+'")\n';
    finalString+='export class '+tableName+'Controller\n';
    finalString+='{\n';
    finalString+='constructor(private '+serviceName+':'+tableName+'Service) {}\n\n';
        
    finalString+='@Get("/all")\n';
    finalString+='findAll()\n';
    finalString+='{\n';
    finalString+='return this.'+serviceName+'.findAll();\n';
    finalString+='}\n\n';
    
    finalString+='@Post("/add")\n';
    finalString+='saveRecords(@Body() v_fname:'+tableName+')\n';
    finalString+='{\n';
    finalString+='return this.'+serviceName+'.saveRecords(v_fname);\n';
    finalString+='}\n\n';
    
    finalString+='@Put("/update")\n';
    finalString+='updateRecords(@Body() update_variable:'+tableName+')\n';
    finalString+='{\n';
    finalString+= 'return this.'+serviceName+'.updateRecords(update_variable);\n';
    finalString+='}\n\n';
    
    finalString+='@Delete("/delete/:id")\n';
    finalString+='deleteRecords(@Param(\'id\') v_Recordid:string)\n';
    finalString+='{\n'
    finalString+=  'return this.'+serviceName+'.deleteRecords(v_Recordid);\n';
    finalString+='}\n';
    finalString+='}\n';
    return finalString;
}

function createServiceContent(fname,fCont)
{
let tableName=getClassName(fCont);

let fstr='import { Injectable, NotFoundException } from "@nestjs/common";\n'
fstr+='import { InjectRepository } from "@nestjs/typeorm";\n'
fstr+='import { getConnection, Repository } from "typeorm";\n'
fstr+='import { '+tableName+' } from "src/database/entites/'+fname+'.entity";\n';
fstr+='import { '+tableName+'dto } from "./'+fname+'.dto";\n\n'

fstr+='@Injectable()\n';
fstr+='export class '+tableName+'Service\n';
fstr+='{\n\n';
fstr+='constructor\n';
fstr+='(';
fstr+='@InjectRepository('+tableName+')\n';
fstr+='private '+tableName+'Repository:Repository<'+tableName+'>,\n';
fstr+='){}\n\n';
     
fstr+='async findAll(): Promise<'+tableName+'[]>\n';
fstr+='{\n';
fstr+='return await this.'+tableName+'.find({Recordid:xxxxxxx});\n';
fstr+='}\n\n';

fstr+='async saveRecords(v_battery:'+tableName+'):Promise<any>\n';
fstr+='{\n';
fstr+='return await this.'+tableName+'.save(v_battery);\n';
fstr+='}\n\n';


fstr+='async updateRecords(v_rec:'+tableName+'):Promise<any>\n';
fstr+='{\n';
fstr+='return await this.'+tableName+'.update({Recordid:v_rec.Recordid},v_rec);\n';
fstr+='}\n';

fstr+='async deleteRecords(v_recordid:string): Promise<any>\n';
fstr+='{\n';
fstr+='return await this.'+tableName+'.delete({Recordid:v_recordid});\n';
fstr+='}\n\n';
      fstr+='}\n';
return fstr;
}

function converttodto(str){
    str=str.replace(/`/g,'');
    str=str.replace(/(?<=\d),(?=\d)/g,'|');
 
    var finalstr='import { ApiProperty } from "@nestjs/swagger";\n\n'
    var t1=str.indexOf('(');
    var s1=str.substring(0,t1);
    finalstr += s1.replace('CREATE','export').replace('TABLE','class').trim();
    finalstr+='dto\n{\n';
    var s2=str.substring(t1+1,str.length-1);
    var arr=s2.split(',');
    
    for(i=0;i<arr.length-1;i++){
        var element=arr[i].trim();
        if(element.startsWith('UNIQUE')||element.startsWith('KEY')||element.startsWith('CONSTRAINT')||element.startsWith('PRIMARY'))
            break;

        var arrWord=element.split(' ');
        for(j=0;j<=arr.length-1;j++){
            if(j==0)
            {                  
                    finalstr+='@ApiProperty()\n';
                    finalstr+=arrWord[j];
            }
             else if(j==1){
                if(arrWord[j].includes('int'))
                    finalstr+=":Number;\n\n";
                else if(arrWord[j].includes('varchar'))
                    finalstr+=":string;\n\n";
                else if(arrWord[j].includes('float'))
                    finalstr+=":Number;\n\n";
                else if(arrWord[j].includes('double'))
                    finalstr+=":Number;\n\n";
                    else if(arrWord[j].includes('decimal'))
                    finalstr+=":number;\n\n";
                else if(arrWord[j].includes('date')||arrWord[j].includes('datetime'))
                    finalstr+=":Date;\n\n";
            }      
        } 
    }
    finalstr+='}\n';
    return finalstr;
}

function converttoentity(str){
    str=str.replace(/`/g,''); // remove all the ` char from the string
   
    //replace all the comma(,) between two digits with | characher e.g double(10,0),decimal(9,3) will be replaced as double(10|0) and decimal(9|3)
    str=str.replace(/(?<=\d),(?=\d)/g,'|'); 

    //finalStr is the output variable with converted string
    //initialize and append with all the static content
    var finalstr='import { Entity,Column, PrimaryColumn } from "typeorm";\n';
    finalstr +='import { ApiProperty } from "@nestjs/swagger";\n\n';

    var t1=str.indexOf('('); //get first bracket index to find the Table name
    var s1=str.substring(0,t1); // cut the string from start to the first bracket to get first line that contains table name 

    //get TABLE name by fetching a substring from s1 starting from TABLE keyword to last s1
    var tableName = s1.substring(s1.indexOf('TABLE')+5,s1.length-1).trim();

    //append Table name in ENTITY
    finalstr += '@Entity("'+tableName+'")\n';

    //replace CREATE with export and TABLE with class to and append to make the line as export class TABLENAME
    finalstr += s1.replace('CREATE','export').replace('TABLE','class');
    finalstr+='\n{\n';

    //cut the remaining string from the sql script str starting after TABLE NAME till last character of str
    var s2=str.substring(t1+1,str.length-1);

    //create an array of columns by splitting s2 by , character 
    var arr=s2.split(',');
    
    //Find Primary Key column
    //declare and initialize primary key variable with ''
    var primaryKeyCol = '';

    //search the sql script str for PRIMARY KEY column
    var pindex=str.indexOf('PRIMARY KEY')

      if(pindex == -1){ //if primary key is not there in the script
        console.log('PRIMARY KEY DOES NOT EXIST');
      }else{  //If primary key is present
        let a1 = str.substring(pindex); //create a substring starting from PRIMARY KEY keyword till last
        
        //get primary key column name by getting a substring after PRIMARY KEY keyword starting from opening bracket (  and ending with closing bracket ) 
        primaryKeyCol = a1.substring(a1.indexOf('(')+1,a1.indexOf(')')).trim();
      }
        
    
    // loop through the array of columns
    for(i=0;i<arr.length-1;i++){

        //get a single line/element from the array
        var element=arr[i].trim();
        
        //ignore unique key or constrainsts
        if(element.startsWith('UNIQUE')||element.startsWith('KEY')||element.startsWith('CONSTRAINT')||element.startsWith('PRIMARY'))  //ignore any other element/keys e.g, PRIMARY KEY, UNIQUE KEY, KEY, DEFAULT etc.
        break;

        //create another array within the line/element by split with single space ' '
        var arrWord=element.split(' ');


        //loop throgh inner array
        for(j=0;j<=arr.length-1;j++){
            if(j==0){ //if it is the first element of the array i.e, it is the column name 
                    if(arrWord[j]==primaryKeyCol) // check if the column name is same as primary kay
                        finalstr+='@PrimaryColumn({ name : \''+arrWord[j]+'\'})\n'+'@ApiProperty()\n';
                    else    
                        finalstr+='@Column({ name : \''+arrWord[j]+'\'})\n'+'@ApiProperty()\n';
                    
                    // append the column name in the final string
                    finalstr+=arrWord[j];
            }            
            else if(j==1){ //if it is the 2nd element that means it is the datatype of the column

                //convert the data type from SQL to NODEJS and format as NODEJS variable, Add new line 
                if(arrWord[j].includes('int'))
                    finalstr+=":number;\n\n";
                else if(arrWord[j].includes('varchar'))
                    finalstr+=":string;\n\n";
                else if(arrWord[j].includes('double'))
                    finalstr+=":number;\n\n";
                else if(arrWord[j].includes('decimal'))
                    finalstr+=":number;\n\n";
                else if(arrWord[j].includes('date')||arrWord[j].includes('datetime'))
                    finalstr+=":Date;\n\n";    
            }     
        }
    }
    finalstr+='\n}\n';// append the last bracket of the class in the final string
    return finalstr; // return the final string to the calling function
}

router.post("/createFile", (req, res) => {
    var filename=req.body.txtfilename;
    var filecontent=req.body.txtcontent;
    if(filename.trim()==''|| filecontent.trim()==''){
        res.json({ data: "File Name/Content cannot be blank !!" });
    }
    let folderName = path.join(__dirname+'/src/api/'+filename+'/');
   
    try{
        if (!fs.existsSync(path.join(__dirname+'/src'))) {
            fs.mkdirSync(path.join(__dirname+'/src'));
            if (!fs.existsSync(path.join(__dirname+'/src/api/'))) {
                fs.mkdirSync(path.join(__dirname+'/src/api/'));
            }
        }
        if (!fs.existsSync(path.join(__dirname+'/src/database'))) {
            fs.mkdirSync(path.join(__dirname+'/src/database'));
            if (!fs.existsSync(path.join(__dirname+'/src/database/entites/'))) {
                fs.mkdirSync(path.join(__dirname+'/src/database/entites/'));
            }
        }
       
    }catch (err) {
        console.error(err);
        return res.json({data: err });
    }

//Duplicate folder check
    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName);
        }else{
            return res.json({ data: "Folder Already Exists !!" });

        }

    } catch (err) {
        console.error(err);
        return res.json({data: err });
    }

    let fname;
    let fcontent;
    let errFiles='';

    for (let i=0;i<=4;i++){
    try{
        switch (i) {
            case 0:
                fname='cntroller.ts';
                fcontent=createControllerContent(filename,filecontent);
                break;
            case 1:
                fname='service.ts';
                fcontent=createServiceContent(filename,filecontent);
                break;
            case 2:
                fname='module.ts';
                fcontent=createModuleContent(filename,filecontent);
                break;
            case 3:
                fname='dto.ts';
                fcontent=converttodto(filecontent);
                break;
            case 4:
                folderName = path.join(__dirname+'/src/database/entites/'); 
                fname='entity.ts';
                fcontent=converttoentity(filecontent);
                break;
            default:
                break;
        }

        }catch(err){
            errFiles +=err;
        }
       
        try {
            fs.writeFileSync(folderName+'/'+filename+'.'+fname,fcontent,function(err){
                if(err){
                    errFiles +=filename+'.'+fname+'; Reason - '+err +'\n\n'; // displaying files which are not created and also the reason why they are not created..
                }   
                
            });
        } catch (error) {
            errFiles +=filename+'.'+fname+';Reason - '+error +'\n\n'; // displaying files which are not created
        }
    }
    if(errFiles =='')
        return res.json({data: "Files Saved" });    
     else
         return res.json({data: "Following files not saved;\n\n"+ errFiles});
});

app.use('/',router);
app.listen(process.env.port || 3001);