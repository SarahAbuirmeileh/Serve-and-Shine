import express from 'express';
import { createPermission, deletePermission, editPermission, getPermissions } from '../controllers/permission.js';
import { authorize } from '../middleware/auth/authorize.js';
import { validatePermission, validatePermissionId } from '../middleware/validation/permission.js';

var router = express.Router();

router.post('/', authorize("POST_permissions"), validatePermission, (req, res, next) => {
    createPermission(req.body).then(() => {
        res.status(201).send("Permission created successfully!!")
    }).catch(err => {
        // console.error(err);
        // res.status(500).send(err);
        next(err);
    });
});

router.delete('/:id', authorize("DELETE_permission"), async (req, res, next) => {
    const id = Number(req.params.id?.toString());

    deletePermission(id)
        .then(data => {
            res.send("Deleted");
        })
        .catch(err => {
            // console.error(error);
            // res.status(500).send('Something went wrong');
            next(err);
        });
})

router.put("/:id", authorize("PUT_permission"), validatePermissionId, async (req, res, next) => {
    editPermission({ ...req.body, id: req.params.id?.toString() }).then(() => {
        res.status(201).send("Permission edited successfully!!")
    }).catch(err => {
        // console.error(err);
        // res.status(500).send(err);
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
            res.send(data);
        })
        .catch(err => {
            // console.error(error);
            // res.status(500).send('Something went wrong');
            next(err);
        });
});

export default router;

