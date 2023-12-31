import { UploadedFile } from "express-fileupload";
import baseLogger from "../../../logger.js";
import { VoluntaryWork } from "../../db/entities/VoluntaryWork.js";
import { configureS3Bucket } from "../../utilities/AWSConfigureS3.js";

const S3 = await configureS3Bucket();

const putImages = async (id: number, uploadedFiles: UploadedFile[], organizationName: string) => {
    try {

        let voluntaryWork = await VoluntaryWork.findOne({ where: { id } });
        if (voluntaryWork) {

            const imageUrls = [];
            for (const file of uploadedFiles) {
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET_NAME || '',
                    Body: Buffer.from(file.data),
                    Key: `${organizationName}/${voluntaryWork.name}/${Date.now().toString()}.png`,
                    ACL: 'public-read',
                };

                const data = await S3.upload(uploadParams).promise();
                imageUrls.push(data.Location);
            }

            voluntaryWork.images.push(...imageUrls);
            await voluntaryWork.save();
        }
    } catch (err) {
        baseLogger.error(err);
        throw ", when trying to add Image";
    }
}

const putCertificateTemplate = async (organizationName: string, uploadedFiles: UploadedFile[]) => {
    try {
        for (const file of uploadedFiles) {
            const uploadParams = {
                Bucket: process.env.AWS_CERTIFICATES_BUCKET_NAME || '',
                Body: Buffer.from(file.data),
                Key: `templates/${organizationName}/certificate_template.html`,
                ACL: 'public-read',
            };
            await S3.upload(uploadParams).promise();
        }
    } catch (err) {
        baseLogger.error(err);
        throw err;
    }
}

const deleteFromS3 = async (key: string, type: string) => {
    try {
        const deleteParams = {
            Bucket: (type === "image" ? process.env.AWS_BUCKET_NAME : process.env.AWS_CERTIFICATES_BUCKET_NAME) || '',
            Key: key,
        };
        await S3.deleteObject(deleteParams).promise();
        return "Image deleted successfully !"

    } catch (err) {
        baseLogger.error("Error deleting image from S3:", err);
        throw err;
    }
}

const loadFromS3 = async (bucketName: string, pathPrefix: string) => {
    try {
        const params = {
            Bucket: bucketName,
            Prefix: pathPrefix,
        };

        const data = await S3.listObjectsV2(params).promise();

        const objectKeys = data?.Contents?.map((object) => object.Key);
        const imageUrls = (objectKeys || []).filter((imageKey) => Boolean(imageKey))
            .map((imageKey) => `https://${bucketName}.s3.amazonaws.com/${imageKey}`);

        return imageUrls;
    } catch (err) {
        baseLogger.error('Error listing and generating URLs from S3:', err);
        throw err;
    }
}

export { putImages, putCertificateTemplate, deleteFromS3, loadFromS3 }