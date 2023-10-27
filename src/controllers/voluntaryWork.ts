import { DeepPartial, In, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual } from "typeorm";
import { NSVoluntaryWork } from "../../types/voluntaryWork.js";
import { SkillTag } from "../db/entities/SkillTag.js";
import { VoluntaryWork } from "../db/entities/VoluntaryWork.js";
import { getDate, isValidDate } from "./index.js";
import { Volunteer } from "../db/entities/Volunteer.js";
import createError from 'http-errors';
import baseLogger from "../../logger.js";
import { invokeLambdaFunction } from "./AWSServices/LambdaFunction.js";
import { sendEmail } from "./AWSServices/SES.js";

const createVoluntaryWork = async (payload: NSVoluntaryWork.Item) => {
    try {
        let payloadDate = { ...payload, startedDate: getDate(payload.startedDate), finishedDate: getDate(payload.finishedDate) };

        let newVoluntaryWork = VoluntaryWork.create(payloadDate as DeepPartial<VoluntaryWork>);
        const skillTags = await SkillTag.find({
            where: { id: In(payload.skillTagIds) },
        });
        newVoluntaryWork.skillTags = skillTags;
        newVoluntaryWork.feedback = [];
        newVoluntaryWork.rating = [];
        newVoluntaryWork.images = [];
        newVoluntaryWork.volunteerProfiles = [];
        return newVoluntaryWork.save();
    } catch (err) {
        baseLogger.error(err);
        throw ", when trying to create Voluntary work";
    }
}

const deleteVoluntaryWork = async (voluntaryWorkId: number) => {
    try {
        await VoluntaryWork.delete(voluntaryWorkId);
        return "Voluntary work entry deleted successfully!"
    } catch (err) {
        baseLogger.error(err);
        throw createError({ status: 404, message: "Voluntary work" });
    }
}

const editVoluntaryWork = async (payload: NSVoluntaryWork.Edit) => {
    try {

        const id = Number(payload.id) || 0;
        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });

        if (voluntaryWork) {
            voluntaryWork.name = payload.name || voluntaryWork.name;
            voluntaryWork.description = payload.description || voluntaryWork.description;
            voluntaryWork.location = payload.location || voluntaryWork.location;
            voluntaryWork.capacity = payload.capacity || voluntaryWork.capacity;
            voluntaryWork.days = payload.days || voluntaryWork.days;
            voluntaryWork.images = payload.images || voluntaryWork.images;
            voluntaryWork.time = payload.time || voluntaryWork.time;
            voluntaryWork.status = payload.status || voluntaryWork.status;

            if (payload.skillTagIds) {
                const skillTags = await SkillTag.find({
                    where: { id: In(payload.skillTagIds) },
                });
                voluntaryWork.skillTags = skillTags;
            }
            if (payload.startedDate) {
                voluntaryWork.startedDate = getDate(payload.startedDate);
            }
            if (payload.finishedDate) {
                voluntaryWork.finishedDate = getDate(payload.finishedDate);
            }

            return voluntaryWork.save();
        }
    } catch (error) {
        baseLogger.error(error);
        throw createError({ status: 404, message: "Voluntary work" });
    }
}

const getVoluntaryWork = (payload: { id: number }) => {
    try {
        return VoluntaryWork.findOne({ where: { id: payload.id } })
    } catch (err) {
        baseLogger.error(err);
        throw createError({ status: 404, message: "Voluntary work" });
    }
}

const getVoluntaryWorks = async (payload: NSVoluntaryWork.GetVoluntaryWorks) => {
    try {

        const page = parseInt(payload.page);
        const pageSize = parseInt(payload.pageSize);
        const conditions: Record<string, any> = {};

        if (payload.id) {
            conditions["id"] = payload.id;
        }
        if (payload.name) {
            conditions["name"] = payload.name;
        }
        if (payload.time?.length > 0) {
            conditions["time"] = In(payload.time);
        }
        if (payload.location) {
            conditions["location"] = payload.location;
        }
        if (payload.avgRating) {
            conditions["avgRating"] = payload.avgRating;
        }
        if (payload.status) {
            conditions["status"] = payload.status;
        }
        if (payload.days?.length > 0) {
            conditions["days"] = In(payload.days);
        }
        if (payload.skills?.length > 0) {
            conditions["skillTags"] = In(payload.skills);
        }
        if (payload.startedDate) {
            conditions["startedDate"] = payload.startedDate;
        }
        if (payload.finishedDate) {
            conditions["finishedDate"] = payload.finishedDate;
        }
        if (payload.capacity) {
            conditions["capacity"] = payload.capacity;
        }
        if (payload.creatorId) {
            conditions["creatorId"] = payload.creatorId;
        }

        if (payload.startedAfter) {
            if (!isValidDate(payload.startedAfter)) throw "Invalid date!"
            const startedAfterDate = getDate(payload.startedAfter);
            conditions["startedDate"] = MoreThan(startedAfterDate);
        }

        if (payload.startedBefore) {
            if (!isValidDate(payload.startedBefore)) throw "Invalid date!"
            const startedBeforeDate = getDate(payload.startedBefore);
            conditions["startedDate"] = LessThan(startedBeforeDate);
        }

        if (payload.finishedAfter) {
            if (!isValidDate(payload.finishedAfter)) throw "Invalid date!"
            const finishedAfterDate = getDate(payload.finishedAfter);
            conditions["finishedDate"] = MoreThan(finishedAfterDate);
        }

        if (payload.finishedBefore) {
            if (!isValidDate(payload.finishedBefore)) throw "Invalid date!"
            const finishedBeforeDate = getDate(payload.finishedBefore);
            conditions["finishedDate"] = LessThan(finishedBeforeDate);
        }

        if (payload.avgRatingMore) {
            conditions["avgRating"] = MoreThanOrEqual(payload.avgRatingMore);
        }

        if (payload.avgRatingLess) {
            conditions["avgRating"] = LessThanOrEqual(payload.avgRatingLess);
        }

        const [voluntaryWorks, total] = await VoluntaryWork.findAndCount({
            where: conditions,
            skip: pageSize * (page - 1),
            take: pageSize,
            order: {
                createdAt: 'ASC'
            },
            relations: ['skillTags', 'volunteerProfiles']
        });

        const processedVW = await Promise.all(voluntaryWorks.map(async vw => {
            const volunteers = [];
            for (const vp of vw.volunteerProfiles) {
                const v = await Volunteer.findOne({ where: { volunteerProfile: { id: vp.id } } });
                if (v) {
                    volunteers.push({ name: v.name });
                }
            }
            return {
                name: vw.name,
                description: vw.description,
                days: vw.days,
                time: vw.time,
                location: vw.location,
                startedDate: vw.startedDate,
                finishedDate: vw.finishedDate,
                status: vw.status,
                images: vw.images,
                avgRating: vw.avgRating,
                feedback: vw.feedback,
                capacity: vw.capacity,
                skillTags: vw.skillTags.map(st => { return { name: st.name } }),
                rating: vw.rating,
                volunteers,
                volunteerNumbers: volunteers.length,
                creatorId: vw.creatorId,
                createdAt: vw.createdAt,
            };
        }));


        return {
            page,
            pageSize: voluntaryWorks.length,
            total,
            voluntaryWorks: processedVW
        };
    } catch (err) {
        baseLogger.error(err);
        throw createError({ message: err });
    }
}

const putRating = async (id: number, rating: number, volunteerName: string) => {
    try {
        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });
        if (voluntaryWork) {
            voluntaryWork.rating.push({ volunteerName, rating });
            voluntaryWork.avgRating = await calculateAvgRating(id) || 0;
            await voluntaryWork.save();
        } else {
            throw createError({ status: 404, message: "Voluntary work" });
        }
    } catch (err) {
        baseLogger.error(err);
        throw createError(404,);
    }
}

const putFeedback = async (id: number, feedback: string, volunteerName: string) => {
    try {
        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });
        if (voluntaryWork) {
            voluntaryWork.feedback.push({ volunteerName, feedback });
            await voluntaryWork.save();
        } else {
            throw createError({ status: 404, message: "Voluntary work" });
        }
    } catch (err) {
        baseLogger.error(err);
        throw ", when trying to add Feedback";
    }
}

const registerByVolunteer = async (workId: number, volunteerProfile: Volunteer["volunteerProfile"]) => {
    try {

        const voluntaryWork = await VoluntaryWork.findOne({ where: { id: workId }, relations: ["skillTags"] });
        if (!voluntaryWork) {
            throw createError({ status: 404, message: "Voluntary work" });
        }

        if (
            volunteerProfile.availableLocation !== voluntaryWork.location ||
            !(volunteerProfile.availableDays?.length > 0 && volunteerProfile.availableDays?.every(day => voluntaryWork.days.includes(day))) ||
            !(volunteerProfile.availableTime?.length > 0 && volunteerProfile.availableTime?.every(time => voluntaryWork.time.includes(time))) ||
            !(voluntaryWork.skillTags?.every(skillTag => volunteerProfile.skillTags.some(workSkill => workSkill.id === skillTag.id)))
        ) {
            throw new Error("Volunteer's profile information does not align with the VoluntaryWork information");
        }

        if (voluntaryWork.volunteerProfiles?.length >= voluntaryWork.capacity) {
            throw new Error("VoluntaryWork is already at full capacity");
        }

        if (voluntaryWork.volunteerProfiles) {
            voluntaryWork.volunteerProfiles.push(volunteerProfile);
        } else {
            voluntaryWork.volunteerProfiles = [volunteerProfile];
        }

        if (volunteerProfile.voluntaryWorks) {
            volunteerProfile.voluntaryWorks.push(voluntaryWork);
        } else {
            volunteerProfile.voluntaryWorks = [voluntaryWork];
        }

        await voluntaryWork.save();
        await volunteerProfile.save()

        return "Registration successful!";
    } catch (err) {
        baseLogger.error(err);
        throw ", when trying to register by Volunteer: " + err;
    }
}

const registerByOrganizationAdmin = async (workId: number, volunteerId: string) => {
    try {

        const voluntaryWork = await VoluntaryWork.findOne({ where: { id: workId } });
        const volunteer = await Volunteer.findOne({
            where: { id: volunteerId },
            relations: ["roles", "roles.permissions", "volunteerProfile", "volunteerProfile.voluntaryWorks"]
        });

        if (!voluntaryWork) {
            throw "Voluntary work not found";
        }
        if (!volunteer) {
            throw "Volunteer not found";
        }

        if (voluntaryWork.volunteerProfiles) {
            voluntaryWork.volunteerProfiles.push(volunteer.volunteerProfile);
        } else {
            voluntaryWork.volunteerProfiles = [volunteer.volunteerProfile];
        }

        if (volunteer.volunteerProfile.voluntaryWorks) {
            volunteer.volunteerProfile.voluntaryWorks.push(voluntaryWork);
        } else {
            volunteer.volunteerProfile.voluntaryWorks = [voluntaryWork];
        }

        await voluntaryWork.save();
        await volunteer.volunteerProfile.save();

        return "Registration successful!";
    } catch (err) {
        baseLogger.error(err);
        throw ", when trying to register by organization admin";
    }
}

const deregisterVoluntaryWork = async (workId: number, volunteerId: string) => {
    try {
        const voluntaryWork = await VoluntaryWork.findOne({ where: { id: workId }, relations: ["volunteerProfiles"] });
        const volunteer = await Volunteer.findOne({ where: { id: volunteerId }, relations: ["volunteerProfile", "volunteerProfile.voluntaryWorks"] });

        if (!voluntaryWork) {
            throw createError({ status: 404, message: "Voluntary work" });
        }

        if (!volunteer) {
            throw createError({ status: 404, message: "Volunteer" });
        }

        const index = voluntaryWork.volunteerProfiles.findIndex(profile => profile.id === volunteer.volunteerProfile.id);
        if (index !== -1) {
            voluntaryWork.volunteerProfiles.splice(index, 1);

            const workIndex = volunteer.volunteerProfile.voluntaryWorks.findIndex(work => work.id === workId);
            if (workIndex !== -1) {
                volunteer.volunteerProfile.voluntaryWorks.splice(workIndex, 1);
            }
            await Promise.all([voluntaryWork.save(), volunteer.volunteerProfile.save()]);

            return "Deregistration successful!";
        } else {
            throw new Error("Volunteer is not registered for this voluntary work");
        }
    } catch (err) {
        baseLogger.error(err);
        throw "Error when trying to deregister voluntary work";
    }
}

const generateCertificate = async (voluntaryWorkId: number, organizationName: string, date: string) => {
    const voluntaryWork = await VoluntaryWork.findOne({
        where: { id: voluntaryWorkId },
        relations: ["volunteerProfiles", "volunteerProfiles.volunteer"]
    });

    if (!voluntaryWork) {
        throw new Error(`Voluntary work with id ${voluntaryWorkId} not found.`);
    }

    const volunteerData = voluntaryWork.volunteerProfiles.map(({ volunteer }) => ({ name: volunteer.name, email: volunteer.email }));
    for (const volunteer of volunteerData) {

        const payload = {
            volunteerName: volunteer.name,
            date,
            voluntaryWorkName: voluntaryWork.name,
            organizationName,
            volunteerEmail: volunteer.email
        }

        invokeLambdaFunction("generateCertificate", payload);
    }
}

const getImages = async (voluntaryWorkId: number) => {
    const voluntaryWork = await VoluntaryWork.findOne({
        where: { id: voluntaryWorkId }
    });

    return voluntaryWork?.images;
}

const getVoluntaryWorksForVolunteer = async (volunteerId: string) => {
    try {
        const volunteer = await Volunteer.findOne({
            where: { id: volunteerId },
            relations: ["volunteerProfile", "volunteerProfile.voluntaryWorks"]
        });

        if (!volunteer) {
            throw createError({ status: 404, message: 'Volunteer not found' });
        }
        return volunteer.volunteerProfile.voluntaryWorks;
    } catch (err) {
        baseLogger.error(err);
        throw createError({ status: 404, message: 'Voluntary Works not found' });
    }
};

const volunteerReminder = async (id: number) => {
    try {

        let voluntaryWork = await VoluntaryWork.findOne({ where: { id }, relations: ["volunteerProfiles", "volunteerProfiles.volunteer"] });
        if (!voluntaryWork) {
            throw new Error(`Voluntary work with id ${id} not found.`);
        }

        const volunteerData = voluntaryWork.volunteerProfiles?.map((volunteer) => ({ name: volunteer.volunteer.name, email: volunteer.volunteer.email }));

        for (const volunteer of volunteerData) {
            sendEmail(
                volunteer.email,
                volunteer.name,
                'Reminder to rate and feedback Voluntary Work!',
                `You have successfully finished ${voluntaryWork?.name}!\nWe encourage you to tell us your opinion and thoughts about our voluntary work, you can rate and create feedback for it!`)
        }

    } catch (err) {
        baseLogger.error(err);
        throw createError(404);
    }
}

const getRecommendation = async (payload: NSVoluntaryWork.Recommendation) => {
    try {

        const page = parseInt(payload.page);
        const pageSize = parseInt(payload.pageSize);
        const conditions: Record<string, any> = {};

        if (payload.time?.length > 0) {
            conditions["time"] = In(payload.time);
        }
        if (payload.location) {
            conditions["location"] = payload.location;
        }
        if (payload.status) {
            conditions["status"] = payload.status;
        }
        if (payload.days?.length > 0) {
            console.log(7);
            conditions["days"] = In(payload.days);
        }
        if (payload.skillTags?.length > 0) {
            conditions["skillTags"] = { id: payload.skillTags };
        }
        console.log(conditions);

        const [voluntaryWorks, total] = await VoluntaryWork.findAndCount({
            where: conditions,
            skip: pageSize * (page - 1),
            take: pageSize,
            order: {
                createdAt: 'ASC'
            },
            relations: ['skillTags', 'volunteerProfiles']
        });

        const processedVW = await Promise.all(voluntaryWorks.map(async vw => {
            const volunteers = [];
            for (const vp of vw.volunteerProfiles) {
                const v = await Volunteer.findOne({ where: { volunteerProfile: { id: vp.id } } });
                if (v) {
                    volunteers.push({ name: v.name });
                }
            }
            return {
                name: vw.name,
                description: vw.description,
                days: vw.days,
                time: vw.time,
                location: vw.location,
                startedDate: vw.startedDate,
                finishedDate: vw.finishedDate,
                status: vw.status,
                capacity: vw.capacity,
                skillTags: vw.skillTags.map(st => { return { name: st.name } }),
                volunteers,
                volunteerNumbers: volunteers.length,
                createdAt: vw.createdAt
            };
        }));

        return {
            page,
            pageSize: voluntaryWorks.length,
            total,
            voluntaryWorks: processedVW
        };
    } catch (err) {
        baseLogger.error(err);
        throw createError({ status: 404, message: "Voluntary work" });
    }
}

const deleteImage = async (voluntaryWorkId: number, imageName: string) => {
    try {
        const voluntaryWork = await VoluntaryWork.findOne({ where: { id: voluntaryWorkId } });
        console.log(imageName);

        if (voluntaryWork) {
            const imagesToDelete = voluntaryWork.images.filter((img) => img.endsWith(imageName));
            console.log(imagesToDelete);

            if (imagesToDelete.length > 0) {
                for (const imageUrl of imagesToDelete) {
                    const imageIndex = voluntaryWork.images.findIndex((img) => img === imageUrl);
                    voluntaryWork.images.splice(imageIndex, 1);
                }

                await voluntaryWork.save();
            }
        };
    } catch (err) {
        baseLogger.error(err);
        throw new Error('Error when trying to delete an image');
    }
}

const calculateAvgRating = async (voluntaryWorkId: number) => {
    const voluntaryWork = await VoluntaryWork.findOne({ where: { id: voluntaryWorkId } });
    if (voluntaryWork) {
        return voluntaryWork.rating.reduce((acc, item) => { return acc + item.rating }, 0) / voluntaryWork.rating.length;
    }
}

export {
    deregisterVoluntaryWork, registerByOrganizationAdmin,
    registerByVolunteer, createVoluntaryWork,
    putFeedback, editVoluntaryWork, putRating, getVoluntaryWork,
    getVoluntaryWorks, deleteVoluntaryWork,
    generateCertificate, getImages, getVoluntaryWorksForVolunteer,
    volunteerReminder, getRecommendation, deleteImage
}