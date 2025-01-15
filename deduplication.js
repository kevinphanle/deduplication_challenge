const path = require("path");
const fs = require("fs");

// check if the lead is newer than the existing lead
const isNewer = (existing, current) => {
    const existingDate = new Date(existing.entryDate);
    const currentDate = new Date(current.entryDate);

    return currentDate > existingDate;
};

function deduplicateLeads(leads) {
    const seenIds = new Map();
    const seenEmails = new Map();
    const log = [];

    const updatedLeads = leads.reduce((deduped, lead) => {
        const { _id, email, entryDate } = lead;

        // check if the lead is already seen by id or email
        const existingLeadById = seenIds.get(_id);
        const existingLeadByEmail = seenEmails.get(email);

        // determine if the lead should be updated
        const shouldUpdateId =
            existingLeadById && isNewer(existingLeadById, lead);
        const shouldUpdateEmail =
            existingLeadByEmail && isNewer(existingLeadByEmail, lead);

        if (shouldUpdateId || shouldUpdateEmail) {
            // if the lead should be updated, update the lead
            // log the lead that is being updated
            const sourceLead = shouldUpdateId
                ? existingLeadById
                : existingLeadByEmail;

            // if we are updating the lead via duplicated id, remove the email from the seenEmails map to refresh the map
            // if we are updating the lead via duplicated email, remove the id from the seenIds map to refresh the map
            if (shouldUpdateId && sourceLead.email !== lead.email) {
                seenEmails.delete(sourceLead.email);
                seenEmails.set(lead.email, lead);
            }
            if (shouldUpdateEmail && sourceLead._id !== lead._id) {
                seenIds.delete(sourceLead._id);
                seenIds.set(lead._id, lead);
            }

            const updatedLead = { ...sourceLead, ...lead };

            // find and update the lead in the deduped array
            const index = deduped.findIndex(
                (dupe) => dupe._id === _id || dupe.email === email
            );
            if (index !== -1) {
                deduped[index] = updatedLead;
            }

            log.push({
                sourceLead,
                updatedLead,

                // determine the changes
                changes: Object.keys(lead).reduce((changes, key) => {
                    if (lead[key] !== sourceLead[key]) {
                        if (key == "_id") {
                            // if
                        }
                        changes[key] = {
                            from: sourceLead[key],
                            to: lead[key],
                        };
                    }
                    return changes;
                }, {}),
            });

            // update the maps
            if (shouldUpdateId) {
                seenIds.set(_id, updatedLead);
            } else {
                seenEmails.set(email, updatedLead);
            }
        } else if (!existingLeadById && !existingLeadByEmail) {
            deduped.push(lead);
            seenIds.set(_id, lead);
            seenEmails.set(email, lead);
        }

        return deduped;
    }, []);

    return {
        updatedLeads,
        log,
    };
}

function processFiles() {
    const inputFilePath = path.join(__dirname, "leads.json");
    const outputFilePath = path.join(__dirname, "dedupedLeads.json");
    const logFilePath = path.join(__dirname, "log.json");

    try {
        //read and parse json file
        const data = fs.readFileSync(inputFilePath, "utf8");
        const records = JSON.parse(data);
        const leads = records.leads;

        const { updatedLeads, log } = deduplicateLeads(leads);

        // write the deduped leads to a new file
        fs.writeFileSync(
            outputFilePath,
            JSON.stringify({ leads: updatedLeads }, null, 2)
        );

        // write the log to a new file
        fs.writeFileSync(logFilePath, JSON.stringify({ log }, null, 2));

        console.log("Deduplication completed. Files saved.");
    } catch (error) {
        console.error("Error processing data", error);
    }
}

processFiles();
