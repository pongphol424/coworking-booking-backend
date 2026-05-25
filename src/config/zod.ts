import * as z from 'zod';

z.config({
    customError: (iss) =>{
        if(iss.input === undefined && iss.path){
            return `${String(iss.path[0])} is required`
        }
        
        if (iss.code === "invalid_type"  && iss.path){
            return `invalid type, ${String(iss.path[0])} expected ${iss.expected}`;
        }

        if(iss.code === "invalid_format" && iss.path){
            return `${String(iss.path[0])} is invalid format`
        }

        if(iss.code === "too_small" && iss.path){
            if(iss.origin === "number"){
                return `${String(iss.path[0])} must be at least ${iss.minimum}`
            }
            if(iss.origin === "string"){
                return `${String(iss.path[0])} must be at least ${iss.minimum} cheracter`
            }
            if(iss.origin === "date"){
                return `${String(iss.path[0])} must be after ${new Date().toISOString().split("T")[0]}`
            }
        }
        return `${iss.errors}` 
    }
})