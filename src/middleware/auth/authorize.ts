import express from 'express';
import { NSPermission } from '../../../types/permission.js';
import { OrganizationAdmin } from '../../db/entities/OrganizationAdmin.js';
import { Volunteer } from '../../db/entities/Volunteer.js';
import { OrganizationProfile } from '../../db/entities/OrganizationProfile.js';
import { VoluntaryWork } from '../../db/entities/VoluntaryWork.js';
import { VolunteerProfile } from '../../db/entities/VolunteerProfile.js';
import createError from 'http-errors';

const authorize = (api: string) => {
    return async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {

        const permissions: NSPermission.Item[] = [];

        if (res.locals.organizationAdmin) {
            const organizationAdmin: OrganizationAdmin = res.locals.organizationAdmin;
            permissions.push(...organizationAdmin.roles.permissions);

        } else if (res.locals.volunteer) {
            const volunteer: Volunteer = res.locals.volunteer;
            volunteer.roles.forEach((role) => {
                permissions.push(...role.permissions);
            });
        }

        if (permissions?.filter(p => p.name === api).length > 0 || (/^PUT_.+/.test(api)) || (/^DELETE_.+/.test(api))) {
            next();
        } else {
            res.status(403).send("You don't have the permission to access this resource!");
        }
    }
}

const checkMe = () => {
    return (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const id = req.params.id;
        if (res.locals.volunteer) {
            if (res.locals.volunteer.id == id) {
                next(createError(403));
            }
        } else if (res.locals.organizationAdmin) {
            if (res.locals.organizationAdmin.id == id) {
                next();
            } else {
                next(createError(401));
            }
        }
    }
}

const checkAdmin = () => {
    return async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const id = req.params.id;
        let organizationProfile = await OrganizationProfile.findOne({ where: { id } });
        const admin = await OrganizationAdmin.findOne({ where: { orgProfile: { id: organizationProfile?.id } } });
        if (res.locals.organizationAdmin) {
            if (res.locals.organizationAdmin.id == admin?.id) {
                next();
            }
        } else {
            next()
        }
    }
}

const checkCreator = () => {
    return async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const id = Number(req.params.id);
        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });

        if (res.locals.organizationAdmin) {
            if (res.locals.organizationAdmin.id == voluntaryWork?.creatorId) {
                next();
            }
        } else if (res.locals.volunteer) {
            if (res.locals.volunteer.id == voluntaryWork?.creatorId) {
                next();
            }
        } else {
            next(createError(401));
        }
    }
}

const c1heckParticipation = () => {
    return async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const id = Number(req.params.id);
        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });
        if(res.locals.volunteer) {
            const volunteer:Volunteer=res.locals.volunteer;
        }else {
            next(createError(401));
        }
    }
}

const checkParticipation = () => {
    return async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const id = Number(req.params.id);

        if (res.locals.volunteer) {
            const volunteer = res.locals.volunteer;
            const volunteerProfile = volunteer.volunteerProfile;

            if (volunteerProfile) {
                const voluntaryWork = await VoluntaryWork.findOne({
                    where: { id },
                    relations: ['volunteerProfiles'] 
                });

                if (voluntaryWork && voluntaryWork.volunteerProfiles.includes(volunteerProfile)) {
                    next();
                }
            }
        } 
        next(createError(401));
    };
};

export {
    authorize,
    checkMe,
    checkAdmin,
    checkCreator,
    checkParticipation
}