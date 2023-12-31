import express from 'express';
import { createPermission, deletePermission, editPermission, getPermissions } from '../controllers/permission.js';
import { authorize } from '../middleware/auth/authorize.js';
import { validatePermission, validatePermissionId } from '../middleware/validation/permission.js';
import { log } from '../controllers/dataBaseLogger.js';
import { NSLogs } from '../../types/logs.js';
import { logToCloudWatch } from '../controllers/AWSServices/CloudWatchLogs.js';

var router = express.Router();

router.post('/', authorize("POST_permission"), validatePermission, (req, res, next) => {
    createPermission(req.body).then((data) => {

        logToCloudWatch(
            'success',
            'permission',
            'Create Permission ' + req.body.name,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send({ message: "Permission created successfully!!", data })
    }).catch(err => {
        logToCloudWatch(
            'failed',
            'permission',
            'Create Permission ' + req.body.name,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.delete('/:id', validatePermissionId, authorize("DELETE_permission"), async (req, res, next) => {
    const id = Number(req.params.id?.toString());

    deletePermission(id)
        .then(data => {
            logToCloudWatch(
                'success',
                'permission',
                'Delete Permission with id: ' + id,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name,
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            logToCloudWatch(
                'failed',
                'permission',
                'Delete Permission with id: ' + id,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name,
            ).then().catch()

            next(err);
        });
})

router.put("/:id", authorize("PUT_permission"), validatePermissionId, async (req, res, next) => {
    editPermission({ ...req.body, id: req.params.id?.toString() }).then(() => {
        logToCloudWatch(
            'success',
            'permission',
            'Edit Permission with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(200).send("Permission edited successfully!!")
    }).catch(err => {
        logToCloudWatch(
            'failed',
            'permission',
            'Edit Permission with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.get('/', authorize("GET_permissions"), async (req, res, next) => {
    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        id: Number(req.query.id) || 0,
        name: req.query.name?.toString() || ""
    };

    getPermissions(payload)
        .then(data => {
            logToCloudWatch(
                'success',
                'permission',
                'Get Permission/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            logToCloudWatch(
                'failed',
                'permission',
                'Get Permission/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

/**
 * @swagger
 * tags:
 *   name: Permission
 *   description: The permission managing API
 */



/**
 * @swagger
 * /permission:
 *   get:
 *     summary: Get permissions based on the provided query parameters or get all permissions
 *     tags: [Permission]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         description: Page number for pagination (optional)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: string
 *         description: Number of items per page (optional)
 *       - in: query
 *         name: id
 *         schema:
 *           type: number
 *         description: Filter permissions by ID (optional)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter permissions by name (optional)
 *     responses:
 *       200:
 *         description: List of permissions or a single permission
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
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *               example:
 *                 page: 1
 *                 pageSize: 10
 *                 total: 2
 *                 permissions:
 *                   - id: 1
 *                     name: "Permission 1"
 *                   - id: 2
 *                     name: "Permission 2"
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Something went wrong
 */

/**
 * @swagger
 * /permission/{id}:
 *   delete:
 *     summary: Delete a permission by ID
 *     tags: [Permission]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the permission to delete
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Something went wrong
 */

/**
 * @swagger
 * /permission:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permission]
 *     requestBody:
 *       description: Permission data to create
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *             required:
 *              true
 *           example:
 *             name: "Permission Name"
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                 message: "Permission created successfully"
 *                 data:
 *                   id: 1
 *                   name: "Permission Name"
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
 * /permission/{id}:
 *   put:
 *     summary: Edit a permission by ID
 *     tags: [Permission]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the permission to edit
 *     requestBody:
 *       description: Permission data to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *             required:
 *                 true
 *           example:
 *             name: "Updated Permission Name"
 *     responses:
 *       200:
 *         description: Permission edited successfully
 *       401:
 *         description: You are unauthorized
 *       403:  
 *         description: You don't have the permission
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Something went wrong
 */


export default router;

