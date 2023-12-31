import { NSLogs } from "../../types/logs.js";
import { Logs } from "../db/entities/Logs.js";

const log = async (payload: NSLogs.Item) => {

    const newLog = Logs.create(payload);
    return newLog.save();

}

export { log }