import express from 'express';
import * as EmailValidator from 'email-validator';
import { isValidPassword } from '../../controllers/index.js';


const validateOrganizationAdmin = (req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => {
    const values = ["name", "description"];
    const organizationProfile = req.body;
    const errorList = values.map(key => !organizationProfile[key] && `${key} is Required!`).filter(Boolean);
    
    if (errorList.length) {
        res.status(400).send(errorList);
    } else {
        next();
    }
}

export {
    validateOrganizationAdmin
}