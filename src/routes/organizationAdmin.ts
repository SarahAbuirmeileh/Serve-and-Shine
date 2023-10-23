import express from "express";
import { createOrganizationAdmin, deleteOrganizationAdmin, editOrganizationAdmin, getOrganizationAdmins } from "../controllers/organizationAdmin.js";
import { authorize, checkMe } from "../middleware/auth/authorize.js";
import { validateAdminEdited, validateAdminId, validateOrganizationAdmin } from "../middleware/validation/organizationAdmin.js";
import { log } from "../controllers/dataBaseLogger.js";
import { NSLogs } from "../../types/logs.js";
import { logToCloudWatch } from "../controllers/AWSServices/CloudWatchLogs.js";
import { login } from "../controllers/volunteer.js";

const router = express.Router();

router.post('/signup', authorize("POST_organizationAdmin"), validateOrganizationAdmin, (req, res, next) => {
    createOrganizationAdmin(req.body).then(async (data) => {
        log({
            userId: data.id,
            userName: req.body.name,
            userType: 'root' as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Create Organization Admin ' + data.name
        }).then().catch()

        logToCloudWatch(
            'success',
            'organization admin',
            'Create Organization Admin ' + data.name,
            data.id,
            req.body.name
        ).then().catch()

        res.status(201).send({message:"Organization Admin created successfully!!" , data})
    }).catch(async err => {
        log({
            userId: "",
            userName: req.body.name,
            userType: 'root' as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Create Organization Admin ' + req.body.name
        }).then().catch()

        logToCloudWatch(
            'failed',
            'organization admin',
            'Create Organization Admin ' + req.body.name,
            "",
            req.body.name
        ).then().catch()

        next(err);
    });
});

router.post('/login', (req, res, next) => {
    const email = req.body.email;
    const name = req.body.name;
    const id = req.body.id;
    login(email, name, id)
        .then(data => {
            res.cookie('myApp', data.token, {
                httpOnly: true,
                maxAge: 60 * 24 * 60 * 1000,
                sameSite: "lax"       // Protect against CSRF attacks
            });

            log({
                userId: id,
                userName: name,
                userType: (data.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Login ' + (name)
            }).then().catch()

            logToCloudWatch(
                'success',
                'organization admin',
                'Login ' + (name),
                id,
                name
            ).then().catch()

            res.status(201).send("You logged in successfully !");
        })
        .catch(err => {
            log({
                userId: id,
                userName: name,
                userType: 'volunteer' as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Login ' + (name)
            }).then().catch()

            logToCloudWatch(
                'failed',
                'organization admin',
                'Login ' + name,
                id,
                name
            ).then().catch()

            res.status(401).send(err);
        })
});

router.delete('/:id', validateAdminId, authorize("DELETE_organizationAdmin"), async (req, res, next) => {
    const id = req.params.id?.toString();

    deleteOrganizationAdmin(id)
        .then(async data => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Delete Organization Admin with id: ' + id
            }).then().catch()

            logToCloudWatch(
                'success',
                'organization admin',
                'Delete Organization Admin with id: ' + id,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(async err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Delete Organization Admin with id: ' + id
            }).then().catch()

            logToCloudWatch(
                'failed',
                'organization admin',
                'Delete Organization Admin with id: ' + id,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.put("/:id", authorize("PUT_organizationAdmin"), validateAdminEdited, async (req, res, next) => {
    editOrganizationAdmin({ ...req.body, id: req.params.id }).then(async () => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Edit Organization Admin with id: ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'success',
            'organization admin',
            'Edit Organization Admin with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send("Organization Admin edited successfully!!")
    }).catch(async err => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Edit Organization Admin with id: ' + req.params.id
        })

        logToCloudWatch(
            'failed',
            'organization admin',
            'Edit Organization Admin with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.get('/search', authorize("GET_organizationAdmins"), async (req, res, next) => {
    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        id: req.query.id?.toString() || '',
        name: req.query.name?.toString() || '',
        email: req.query.email?.toString() || '',
        organizationName: req.query.organizationName?.toString() || ''
    };

    getOrganizationAdmins(payload)
        .then(async data => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer?.type ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Get Organization Admin/s'
            }).then().catch()

            logToCloudWatch(
                'success',
                'organization admin',
                'Get Organization Admin/s',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            res.send(data);
        })
        .catch(async err => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer?.type ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Get Organization Admin/s'
            }).then().catch()

            logToCloudWatch(
                'failed',
                'organization admin',
                'Get Organization Admin/s',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
});

export default router;