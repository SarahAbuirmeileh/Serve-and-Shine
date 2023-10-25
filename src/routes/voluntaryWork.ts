import express from 'express';
import { createVoluntaryWork, deleteImage, deleteVoluntaryWork, deregisterVoluntaryWork, editVoluntaryWork, generateCertificate, getImages, getRecommendation, getVoluntaryWork, getVoluntaryWorks, getVoluntaryWorksForVolunteer, putFeedback, putRating, registerByOrganizationAdmin, registerByVolunteer, volunteerReminder } from '../controllers/voluntaryWork.js';
import { NSVolunteer } from '../../types/volunteer.js';
import { NSVoluntaryWork } from '../../types/voluntaryWork.js';
import { authorize, checkParticipation } from '../middleware/auth/authorize.js';
import { validateDeleteFromS3, validateEditedVoluntaryWork, validateVoluntaryWork, validateVoluntaryWorkId } from '../middleware/validation/voluntaryWork.js';
import { log } from '../controllers/dataBaseLogger.js';
import { NSLogs } from '../../types/logs.js';
import { logToCloudWatch } from '../controllers/AWSServices/CloudWatchLogs.js';
import { deleteFromS3, loadFromS3, putCertificateTemplate, putImages } from '../controllers/AWSServices/S3.js';
import { searchOrganizationProfile } from '../controllers/OrganizationProfile .js';
import { validateVolunteerId } from '../middleware/validation/volunteer.js';
import { sendEmail } from '../controllers/AWSServices/SES.js';
import { VoluntaryWork } from '../db/entities/VoluntaryWork.js';
import { Volunteer } from '../db/entities/Volunteer.js';
import { SkillTag } from '../db/entities/SkillTag.js';
import { OrganizationProfile } from '../db/entities/OrganizationProfile.js';
import baseLogger from '../../logger.js';

var router = express.Router();

router.post('/', authorize("POST_voluntaryWork"), validateVoluntaryWork, (req, res, next) => {
    createVoluntaryWork({ ...req.body, creatorId: res.locals.volunteer?.id || res.locals.organizationAdmin?.id }).then((data) => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Create Voluntary Work ' + req.body.name
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Create Voluntary Work ' + req.body.name,
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        res.status(201).send({ message: "Voluntary work created successfully!!", data })
    }).catch(err => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Create Voluntary Work ' + req.body.name
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Create Voluntary Work ' + req.body.name,
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        next(err);
    });
});

router.post("/rating/:id", validateVoluntaryWorkId, authorize("DELETE_voluntaryWork"), async (req, res, next) => {
    volunteerReminder(Number(req.params.id)).then(() => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Reminder to add rating and feedback for voluntary work with id: ' + req.params.id,

        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Reminder to add rating and feedback for voluntary work with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send("Create remainder for rate and feedback  successfully!!")
    }).catch(err => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Reminder to add rating and feedback for voluntary work with id: ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Reminder to add rating and feedback for voluntary work with id: ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    });
});

router.delete('/:id', validateVoluntaryWorkId, authorize("DELETE_voluntaryWork"), async (req, res, next) => {
    const id = Number(req.params.id?.toString());

    deleteVoluntaryWork(id)
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Delete Voluntary Work with id: ' + id
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Delete Voluntary Work with id: ' + id,
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Delete Voluntary Work with id: ' + id
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Delete Voluntary Work with id: ' + id,
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
})

router.delete('/image/:id', validateVoluntaryWorkId, authorize("PUT_images"), validateDeleteFromS3, async (req, res, next) => {

    const id = Number(req.params.id?.toString());
    const voluntaryWork = await getVoluntaryWork({ id });
    const organizationProfile = await searchOrganizationProfile({ page: "", pageSize: "", id: "", name: "", adminName: res.locals.organizationAdmin.name });
    const key = `${organizationProfile?.name || req.body.organizationName}/${voluntaryWork?.name}/${req.body.imageName}.png`

    deleteImage(id, req.body.imageName + '.png').then(() => {
        deleteFromS3(key, 'image')
            .then(data => {
                log({
                    userId: res.locals.organizationAdmin?.id,
                    userName: res.locals.organizationAdmin?.name,
                    userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                    type: 'success' as NSLogs.Type,
                    request: 'Delete image from Voluntary Work with id: ' + id
                }).then().catch()

                logToCloudWatch(
                    'success',
                    'voluntary work',
                    'Delete image from Voluntary Work with id: ' + id,
                    res.locals.organizationAdmin?.id,
                    res.locals.organizationAdmin?.name
                ).then().catch()

                res.send(data);
            })
            .catch(err => {
                log({
                    userId: res.locals.organizationAdmin?.id,
                    userName: res.locals.organizationAdmin?.name,
                    userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                    type: 'failed' as NSLogs.Type,
                    request: 'Delete image from Voluntary Work with id: ' + id
                }).then().catch()

                logToCloudWatch(
                    'failed',
                    'voluntary work',
                    'Delete image from Voluntary Work with id: ' + id,
                    res.locals.organizationAdmin?.id,
                    res.locals.organizationAdmin?.name
                ).then().catch()

                next(err);
            });

    }).catch(err => {
        baseLogger.error(err);
        next(err);
    })


})

router.delete('/certificate/:id', validateVoluntaryWorkId, authorize("DELETE_voluntaryWork"), validateDeleteFromS3, async (req, res, next) => {

    const id = Number(req.params.id?.toString());
    const voluntaryWork = await getVoluntaryWork({ id });
    const key = `certificates/${req.body.organizationName}/${voluntaryWork?.name}/${req.body.volunteerName}.pdf`

    deleteFromS3(key, "certificate")
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Delete certificate for volunteer: ' + req.body.volunteerName
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Delete certificate for volunteer: ' + req.body.volunteerName,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Delete image for volunteer: ' + req.body.volunteerName
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Delete image for volunteer: ' + req.body.volunteerName,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
})

router.delete('/template/:id', validateVoluntaryWorkId, authorize("DELETE_voluntaryWork"), validateDeleteFromS3, async (req, res, next) => {

    const id = Number(req.params.id?.toString());
    const voluntaryWork = await getVoluntaryWork({ id });
    const key = `templates/${req.body.organizationName}/certificate_template.html`

    deleteFromS3(key, "template")
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Delete template for organization :' + req.body.organizationName
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Delete template for organization :' + req.body.organizationName,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Delete template for organization :' + req.body.organizationName
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Delete template for organization :' + req.body.organizationName,
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
})

router.put("/:id", authorize("PUT_voluntaryWork"), validateEditedVoluntaryWork, async (req, res, next) => {
    editVoluntaryWork({ ...req.body, id: req.params.id?.toString() }).then(() => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Edit Voluntary Work with id: ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Edit Voluntary Work with id: ' + req.params.id,
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        res.status(201).send("Voluntary Work edited successfully!!")
    }).catch(err => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Edit Voluntary Work with id: ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Edit Voluntary Work with id: ' + req.params.id,
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        next(err);
    });
});

router.get('/search', authorize("GET_voluntaryWorks"), async (req, res, next) => {

    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        id: Number(req.query.id) || 0,
        name: req.query.name?.toString() || '',
        time: ((Array.isArray(req.query.time) ? req.query.time : [req.query.time]).filter(Boolean)) as NSVolunteer.AvailableTime[],
        location: (typeof req.query.location === 'string' ? req.query.location : ''),
        days: (Array.isArray(req.query.days) ? req.query.days : [req.query.days]).filter(Boolean) as NSVolunteer.AvailableDays[],
        rating: Number(req.query.rating) || 0,
        status: req.query.status as NSVoluntaryWork.StatusType,
        skills: (Array.isArray(req.query.skills) ? req.query.skills : [req.query.skills]).filter(Boolean) as string[],
        startedDate: req.query.startedDate?.toString() || "",
        finishedDate: req.query.finishedDate?.toString() || "",
        capacity: Number(req.query.capacity) || 0,
        finishedAfter: "",
        finishedBefore: "",
        startedAfter: "",
        startedBefore: "",
        ratingMore: Number(req.query.ratingMore) || 0,
        ratingLess: Number(req.query.ratingLess) || 0,
        creatorId: ""
    };

    getVoluntaryWorks(payload)
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Search Voluntary Work/s'
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Search Voluntary Work/s',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Search Voluntary Work/s'
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Search Voluntary Work/s',
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
});

router.get('/analysis', authorize("GET_analysis"), async (req, res, next) => {

    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        id: Number(req.query.id) || 0,
        name: req.query.name?.toString() || '',
        time: ((Array.isArray(req.query.time) ? req.query.time : [req.query.time]).filter(Boolean)) as NSVolunteer.AvailableTime[],
        location: (typeof req.query.location === 'string' ? req.query.location : ''),
        days: (Array.isArray(req.query.days) ? req.query.days : [req.query.days]).filter(Boolean) as NSVolunteer.AvailableDays[],
        rating: Number(req.query.rating) || 0,
        status: req.query.status as NSVoluntaryWork.StatusType,
        skills: (Array.isArray(req.query.skills) ? req.query.skills : [req.query.skills]).filter(Boolean) as string[],
        startedDate: req.query.startedDate?.toString() || "",
        finishedDate: req.query.finishedDate?.toString() || "",
        capacity: Number(req.query.capacity) || 0,
        finishedAfter: req.query.finishedDate?.toString() || "",
        finishedBefore: req.query.finishedBefore?.toString() || "",
        startedAfter: req.query.startedAfter?.toString() || "",
        startedBefore: req.query.startedBefore?.toString() || "",
        ratingMore: Number(req.query.ratingMore) || 0,
        ratingLess: Number(req.query.ratingLess) || 0,
        creatorId: req.query.creatorId?.toString() || ""
    };

    getVoluntaryWorks(payload)
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: 'root' as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Analysis Voluntary Work/s'
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Analysis Voluntary Work/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: "root" as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Analysis Voluntary Work/s'
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Analysis Voluntary Work/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.get('/recommendation', authorize("GET_recommendation"), async (req, res, next) => {
    const skillTags: SkillTag[] = res.locals.volunteer.volunteerProfile.skillTags;
    const payload = {
        page: req.query.page?.toString() || '1',
        pageSize: req.query.pageSize?.toString() || '10',
        time: res.locals.volunteer.availableTime as NSVolunteer.AvailableTime[],
        location: res.locals.volunteer.availableLocation,
        days: res.locals.volunteer.availableDays as NSVolunteer.AvailableDays[],
        status: "Pending" as NSVoluntaryWork.StatusType,
        skillTags: skillTags.map(skillTag => skillTag.id)
    };

    getRecommendation(payload)
        .then(data => {
            log({
                userId: res.locals.volunteer?.id,
                userName: res.locals.volunteer?.name,
                userType: res.locals.volunteer?.type as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Get recommendation'
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Get recommendation',
                res.locals.volunteer?.id,
                res.locals.volunteer?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.volunteer?.id,
                userName: res.locals.volunteer?.name,
                userType: res.locals.volunteer?.type as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Get recommendation'
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Get recommendation',
                res.locals.volunteer?.id,
                res.locals.volunteer?.name
            ).then().catch()
            next(err);
        });
});

router.get('/image/:id', validateVoluntaryWorkId, async (req, res, next) => {
    getImages(Number(req.params.id))
        .then(data => {
            log({
                userId: res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                userName: res.locals.volunteer?.name || res.locals.organizationAdmin?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Get image/s for voluntary work with id: ' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Get image/s',
                res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                res.locals.volunteer?.name || res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                userName: res.locals.volunteer?.name || res.locals.organizationAdmin?.name,
                userType: res.locals.volunteer?.type as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Get image/s for voluntary work with id: ' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Get image/s',
                res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                res.locals.volunteer?.name || res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.get('/template/:id', authorize("PUT_images"), async (req, res, next) => {
    const payload = {page:'', pageSize:'', id:'', name:'', adminName:res.locals.organizationAdmin.name}
    const organizationProfile = await searchOrganizationProfile(payload);
    
    const prefix = `templates/${organizationProfile?.name || req.body.organizationName}`
    loadFromS3(process.env.AWS_CERTIFICATES_BUCKET_NAME || '', prefix)
        .then(data => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Get template/s for organization: ' + req.body.organizationName
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Get template/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Get template/s for organization: ' + req.body.organizationName
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Get template/s',
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.get('/volunteer/:id', validateVolunteerId, async (req, res, next) => {
    getVoluntaryWorksForVolunteer(req.params.id)
        .then(data => {
            log({
                userId: res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                userName: res.locals.volunteer?.name || res.locals.organizationAdmin?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Get voluntary works for volunteer with id: ' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Get voluntary works for volunteer',
                res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                res.locals.volunteer?.name || res.locals.organizationAdmin?.name
            ).then().catch()

            res.send(data);
        })
        .catch(err => {
            log({
                userId: res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                userName: res.locals.volunteer?.name || res.locals.organizationAdmin?.name,
                userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Get voluntary works for volunteer with id: ' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Get voluntary works for volunteer',
                res.locals.volunteer?.id || res.locals.organizationAdmin?.id,
                res.locals.volunteer?.name || res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
});

router.put("/rating/:id", validateVoluntaryWorkId, authorize("PUT_rating"), checkParticipation, async (req, res, next) => {
    putRating(Number(req.params.id), Number(req.body.rating)).then(() => {
        log({
            userId: res.locals.volunteer?.id,
            userName: res.locals.volunteer?.name,
            userType: res.locals.volunteer?.type as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Add Rating to voluntary work with id' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Add Rating to voluntary work with id' + req.params.id,
            res.locals.volunteer?.id,
            res.locals.volunteer?.name
        ).then().catch()

        res.status(201).send("Rating added successfully!!")
    }).catch(err => {
        log({
            userId: res.locals.volunteer?.id,
            userName: res.locals.volunteer?.name,
            userType: res.locals.volunteer?.type as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Add Rating to voluntary work with id' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Add Rating to voluntary work with id' + req.params.id,
            res.locals.volunteer?.id,
            res.locals.volunteer?.name
        ).then().catch()

        next(err);
    });
});

router.put("/feedback/:id", validateVoluntaryWorkId, authorize("PUT_feedback"), checkParticipation, async (req, res, next) => {
    putFeedback(Number(req.params.id), req.body.feedback).then(() => {
        log({
            userId: res.locals.volunteer?.id,
            userName: res.locals.volunteer?.name,
            userType: res.locals.volunteer?.type as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Add feedback to voluntary work with id' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Add feedback to voluntary work with id' + req.params.id,
            res.locals.volunteer?.id,
            res.locals.volunteer?.name
        ).then().catch()

        res.status(201).send("Feedback added successfully!!")
    }).catch(err => {
        log({
            userId: res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: res.locals.volunteer?.type as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Add feedback to voluntary work with id' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Add feedback to voluntary work with id' + req.params.id,
            res.locals.volunteer?.id,
            res.locals.volunteer?.name
        ).then().catch()

        next(err);
    });
});

router.put("/image/:id", validateVoluntaryWorkId, authorize("PUT_images"), async (req, res, next) => {
    const images = req.files?.image;
    if (!images) {
        return res.status(400).send("No images provided.");
    }

    try {
        const uploadedFiles = Array.isArray(images) ? images : [images];

        const payload = { page: "", pageSize: "", id: "", name: "", adminName: res.locals.organizationAdmin.name };
        const organization = await searchOrganizationProfile(payload);
        const organizationName = organization?.name || req.body.organizationName;

        await putImages(Number(req.params.id), uploadedFiles, organizationName);

        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Add images to voluntary work with id ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Add images to voluntary work with id ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send("Images added successfully!!");
    } catch (err) {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Add images to voluntary work with id ' + req.params.id
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Add images to voluntary work with id ' + req.params.id,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    }
});

router.put("/register/:id", validateVoluntaryWorkId, authorize("REGISTER_voluntaryWork"), async (req, res, next) => {
    const voluntaryWork = await VoluntaryWork.findOne({ where: { id: Number(req.params.id) } })
    if (res.locals.volunteer) {
        registerByVolunteer(Number(req.params.id), res.locals.volunteer?.volunteerProfile).then(async () => {
            log({
                userId: res.locals.volunteer?.id,
                userName: res.locals.volunteer?.name,
                userType: res.locals.volunteer?.type as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Register to voluntary work with id' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Register to voluntary work with id' + req.params.id,
                res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
                res.locals.organizationAdmin?.name || res.locals.volunteer?.name
            ).then().catch()

            sendEmail(
                res.locals.volunteer.email,
                res.locals.volunteer.name,
                'Registration in Voluntary Work!',
                `You have successfully registered in ${voluntaryWork?.name}!`)

            res.status(201).send("Registration done successfully!!")
        }).catch(err => {
            log({
                userId: res.locals.volunteer?.id,
                userName: res.locals.volunteer?.name,
                userType: res.locals.volunteer?.type as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Register to voluntary work with id' + req.params.id
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Register to voluntary work with id' + req.params.id,
                res.locals.volunteer?.id,
                res.locals.volunteer?.name
            ).then().catch()

            next(err);
        });
    } else if (res.locals.organizationAdmin) {
        if (!req.body.volunteerId.toString()) {
            res.status(400).send("volunteer id is required!");
        }
        const volunteer = await Volunteer.findOne({ where: { id: (req.body.volunteerId.toString()) } })
        registerByOrganizationAdmin(Number(req.params.id), req.body.volunteerId.toString()).then(() => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'success' as NSLogs.Type,
                request: 'Register By Organization Admin to voluntary work with id' + req.params.id + " volunteer id: " + req.body.volunteerId.toString()
            }).then().catch()

            logToCloudWatch(
                'success',
                'voluntary work',
                'Register By Organization Admin to voluntary work with id' + req.params.id + " volunteer id: " + req.body.volunteerId.toString(),
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            if (volunteer) {
                sendEmail(
                    volunteer.email,
                    volunteer.name,
                    'Registration in Voluntary Work!',
                    `You have successfully registered in ${voluntaryWork?.name}!`)
            }

            res.status(201).send("Registration done successfully!!")
        }).catch(err => {
            log({
                userId: res.locals.organizationAdmin?.id,
                userName: res.locals.organizationAdmin?.name,
                userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
                type: 'failed' as NSLogs.Type,
                request: 'Register By Organization Admin to voluntary work with id' + req.params.id + " volunteer id: " + req.body.volunteerId.toString()
            }).then().catch()

            logToCloudWatch(
                'failed',
                'voluntary work',
                'Register By Organization Admin to voluntary work with id' + req.params.id + " volunteer id: " + req.body.volunteerId.toString(),
                res.locals.organizationAdmin?.id,
                res.locals.organizationAdmin?.name
            ).then().catch()

            next(err);
        });
    }
});

router.put("/deregister/:id", validateVoluntaryWorkId, authorize("DEREGISTER_voluntaryWork"), async (req, res, next) => {
    const voluntaryWork = await VoluntaryWork.findOne({ where: { id: Number(req.params.id) } })
    const volunteer = await Volunteer.findOne({ where: { id: (req.body.volunteerId.toString()) } })

    deregisterVoluntaryWork(Number(req.params.id), res.locals.volunteer.id || req.body.volunteerId.toString()).then(() => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Deregister to voluntary work with id' + req.params.id + " volunteer id: " + res.locals.volunteer?.id || req.body.volunteerId.toString()
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Deregister to voluntary work with id' + req.params.id + " volunteer id: " + res.locals.volunteer?.id || req.body.volunteerId.toString(),
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        sendEmail(
            res.locals.volunteer.email || volunteer?.email,
            res.locals.volunteer.name || volunteer?.name,
            'Deregistration from Voluntary Work!',
            `You have unfortunately deregistered from ${voluntaryWork?.name}. We hope to see you in other voluntary works!`)

        res.status(201).send("Deregistration done successfully!!")
    }).catch(err => {
        log({
            userId: res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            userName: res.locals.organizationAdmin?.name || res.locals.volunteer?.name,
            userType: (res.locals.volunteer ? res.locals.volunteer?.type : res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'failed' as NSLogs.Type,
            request: 'Deregister to voluntary work with id' + req.params.id + " volunteer id: " + res.locals.volunteer?.id || req.body.volunteerId.toString()
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Deregister to voluntary work with id' + req.params.id + " volunteer id: " + res.locals.volunteer?.id || req.body.volunteerId.toString(),
            res.locals.organizationAdmin?.id || res.locals.volunteer?.id,
            res.locals.organizationAdmin?.name || res.locals.volunteer?.name
        ).then().catch()

        next(err);
    });
});

router.put("/template/:id", validateVoluntaryWorkId, authorize("PUT_images"), async (req, res, next) => {
    const templates = req.files?.template;
    if (!templates) {
        return res.status(400).send("No Template provided.");
    }

    const uploadedFiles = Array.isArray(templates) ? templates : [templates];

    const payload = { page: "", pageSize: "", id: "", name: "", adminName: res.locals.organizationAdmin.name };
    const organization = await searchOrganizationProfile(payload);
    const organizationName = organization?.name || req.body.organizationName;

    await putCertificateTemplate(organizationName, uploadedFiles).then(() => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Template added successfully for organization: ' + organizationName
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Template added successfully for organization: ' + organizationName,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send("Template added successfully!!")

    }).catch((err) => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Adding template for organization: ' + organizationName
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Adding template for organization: ' + organizationName,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    })

});

router.post("/generate-certificate/:id", validateVoluntaryWorkId, authorize("PUT_images"), async (req, res, next) => {
    const currentDate = new Date();
    const date = `${currentDate.getDate()} ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`

    const payload = { page: "", pageSize: "", id: "", name: "", adminName: res.locals.organizationAdmin.name };
    const organization = await searchOrganizationProfile(payload);
    const organizationName = organization?.name || '';

    generateCertificate(Number(req.params.id), organizationName, req.body.date || date).then(() => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Certifications generated successfully for organization: ' + organizationName
        }).then().catch()

        logToCloudWatch(
            'success',
            'voluntary work',
            'Certifications generated successfully for organization: ' + organizationName,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        res.status(201).send("Template added successfully!!")

    }).catch((err) => {
        log({
            userId: res.locals.organizationAdmin?.id,
            userName: res.locals.organizationAdmin?.name,
            userType: (res.locals.organizationAdmin?.name === "root" ? "root" : 'admin') as NSLogs.userType,
            type: 'success' as NSLogs.Type,
            request: 'Generating certifications for organization: ' + organizationName
        }).then().catch()

        logToCloudWatch(
            'failed',
            'voluntary work',
            'Generating certifications for organization: ' + organizationName,
            res.locals.organizationAdmin?.id,
            res.locals.organizationAdmin?.name
        ).then().catch()

        next(err);
    })

});

export default router;