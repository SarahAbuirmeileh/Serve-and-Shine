import express from "express";
import { createOrganizationProfile, deleteOrganizationProfile, editOrganizationProfile, getOrganizationProfile, searchOrganizationProfile } from "../controllers/OrganizationProfile .js";
import { authorize, checkAdmin } from "../middleware/auth/authorize.js";
import { validateOrgId, validateOrganizationProfile } from "../middleware/validation/organizationProfile.js";
import { log } from "../controllers/dataBaseLogger.js";
import { NSLogs } from "../../types/logs.js";
import { logToCloudWatch } from "../controllers/AWSServices/CloudWatchLogs.js";

const router = express.Router();

router.post('/', authorize("POST_organizationProfile"), validateOrganizationProfile, (req, res, next) => {
    createOrganizationProfile(req.body).then((data) => {
        logToCloudWatch(
            'success',
            'organization profile',
            'Create Organization Profile ' + data.name,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send({message:"Organization Profile created successfully!!" , data})
    }).catch(err => {
        logToCloudWatch(
            'failed',
            'organization profile',
            'Create Organization Profile ' + req.body.name,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.delete('/:id', validateOrgId, authorize("DELETE_organizationProfile"), async (req, res, next) => {
    const id = (req.params.id?.toString());

    deleteOrganizationProfile(id)
        .then(data => {
            logToCloudWatch(
                'success',
                'organization profile',
                'Volunteer registered successfully!',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            logToCloudWatch(
                'failed',
                'organization profile',
                'Volunteer registered successfully!',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.put("/:id", validateOrgId, authorize("PUT_organizationProfile"), async (req, res, next) => {
    editOrganizationProfile(req.body).then(() => {
        logToCloudWatch(
            'success',
            'organization profile',
            'Volunteer registered successfully!',
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(200).send("Organization Profile edited successfully!!")
    }).catch(err => {
        logToCloudWatch(
            'failed',
            'organization profile',
            'Volunteer registered successfully!',
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.get('/search', authorize("GET_organizationProfiles"), async (req, res, next) => {
    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        id: req.query.id?.toString() || '',
        name: req.query.name?.toString() || '',
        adminName: req.query.adminName?.toString() || ''
    };

    searchOrganizationProfile(payload)
        .then(data => {
            logToCloudWatch(
                'success',
                'organization profile',
                'Search Organization Profiles',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            res.status(200).send(data);
        })
        .catch(err => {
            logToCloudWatch(
                'failed',
                'organization profile',
                'Search Organization Profiles',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
});

router.get('/', authorize("GET_organizationProfiles"), async (req, res, next) => {
    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
    };

    getOrganizationProfile(payload)
        .then(data => {
            logToCloudWatch(
                'success',
                'organization profile',
                'Get Organization Profiles',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            logToCloudWatch(
                'failed',
                'organization profile',
                'Get Organization Profiles',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
});

/**
 * @swagger
 * tags:
 *   name: OrganizationProfile
 *   description: The OrganizationProfile managing API
 */



/**
 * @swagger
 * /organizationProfile:
 *   get:
 *     summary: Get all organization profiles
 *     tags: [OrganizationProfile]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: string
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 organizationProfiles:
 *                   type: array
 *                   items:
 *                     type: object
 *               example:
 *                 page: 1
 *                 pageSize: 10
 *                 total: 3
 *                 organizationProfiles:
 *                   - name: "Organization 1"
 *                     description: "this is a test"
 *                     createdAt: 2023-10-26T09:58:16.590Z
 *                   - name: "Organization 2"
 *                     description: "this is a test"
 *                     createdAt: 2023-10-26T09:58:55.481Z
 *                   - name: "Organization 3"
 *                     description: "this is a test"
 *                     createdAt: 2023-10-26T09:59:23.481Z
 *       401:
 *         description:  You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       500: 
 *         description: Something went wrong
 */

/**
 * @swagger
 * /organizationProfile/search:
 *   get:
 *     summary: Get organization profile based on the provided query parameters
 *     tags: [OrganizationProfile]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter organization profile by ID
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter organization profile by name
 *       - in: query
 *         name: adminName
 *         schema:
 *           type: string
 *         description: Filter organization profile by admin name
 *     responses:
 *       200:
 *         description: Find organization profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizationProfile:
 *                   type: object
 *               example:
 *                 organizationProfile:
 *                   - id: "8995852d-5b2e-4aff-a6fe-3e96cab49add"
 *                     name: "Test 1"
 *                     description: "this is a test"
 *                     createdAt: "2023-10-26T11:00:41.632Z"
 *                     
 *       404:
 *         description: Organization Profile not found
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       500: 
 *         description: Something went wrong
 */

/**
 * @swagger
 * /organizationProfile/{id}:
 *   delete:
 *     summary: Delete an organization profile by ID
 *     tags: [OrganizationProfile]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the organization profile to delete
 *     responses:
 *       200:
 *         description: Organization profile deleted successfully
 *       404:
 *         description: Organization profile not found
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       500: 
 *         description: Something went wrong
 */

/**
 * @swagger
 * /organizationProfile:
 *   post:
 *     summary: Create a new organization profile
 *     tags: [OrganizationProfile]
 *     requestBody:
 *       description: Organization profile data to create
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               # Add other properties from NSOganizationProfile.Item as needed
 *           example:
 *             name: "Organization Profile Name"
 *             description: "this is a test"
 *     responses:
 *       201:
 *         description: Organization profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   # Define the structure of the returned data here
 *               example:
 *                 message: "Organization profile created successfully"
 *                 data:
 *                   name: "Organization Profile Name"
 *                   description: "this is a test"
 *                   id: 03b080e6-87d6-4211-9e75-1c8e8c089ed6
 *                   createdAt: 2023-10-26T10:03:30.233Z
 *       400:
 *         description: Bad request, validation failed
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       500: 
 *         description: Something went wrong
 */

/**
 * @swagger
 * /organizationProfile/{id}:
 *   put:
 *     summary: Edit an organization profile by ID
 *     tags: [OrganizationProfile]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the organization profile to edit
 *     requestBody:
 *       description: Organization profile data to update
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *           example:
 *             name: "New Name"
 *     responses:
 *       200:
 *         description: Organization Profile edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                  name: "Updated Organization Profile Name"
 *       404:
 *         description: Organization Profile not found
 *       401:
 *         description: You are nauthorized
 *       403:  
 *         description: You don't have the permission
 *       500: 
 *         description: Something went wrong
 */

export default router;