
import { db } from '../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { MOCK_USERS, MOCK_SPRINTS, MOCK_PARTICIPANT_SPRINTS, MOCK_MESSAGES } from '../services/mockData';
import { User, Sprint, ParticipantSprint, Message, UserRole } from '../types';


const migrateData = async () => {
    console.log('Starting data migration...');

    // Migrate Users
    console.log('Migrating Users...');
    for (const user of MOCK_USERS) {
        try {
            // We need to convert date strings to Firestore Timestamps
            const userData = {
                ...user,
                createdAt: Timestamp.fromDate(new Date(user.createdAt)),
            };
            await addDoc(collection(db, 'users'), userData);
            console.log(`Added user: ${user.name}`);
        } catch (e) {
            console.error("Error adding user: ", e);
        }
    }

    // Migrate Sprints
    console.log('Migrating Sprints...');
     for (const sprintId in MOCK_SPRINTS) {
        if (Object.prototype.hasOwnProperty.call(MOCK_SPRINTS, sprintId)) {
            const sprint = MOCK_SPRINTS[sprintId];
             try {
                // Convert date strings to Firestore Timestamps
                const sprintData = {
                    ...sprint,
                    dailyContent: sprint.dailyContent.map(dc => ({...dc})),
                };
                await addDoc(collection(db, 'sprints'), sprintData);
                console.log(`Added sprint: ${sprint.title}`);
            } catch (e) {
                console.error("Error adding sprint: ", e);
            }
        }
    }

    // Migrate ParticipantSprints
    console.log('Migrating ParticipantSprints...');
    for (const ps of MOCK_PARTICIPANT_SPRINTS) {
         try {
             // Convert date strings to Firestore Timestamps
            const participantSprintData = {
                ...ps,
                startDate: Timestamp.fromDate(new Date(ps.startDate)),
                progress: ps.progress.map(p => ({
                    ...p,
                    completedAt: p.completedAt ? Timestamp.fromDate(new Date(p.completedAt)) : null,
                })),
            };
            await addDoc(collection(db, 'participantSprints'), participantSprintData);
            console.log(`Added participant sprint for participantId: ${ps.participantId}`);
        } catch (e) {
            console.error("Error adding participant sprint: ", e);
        }
    }
    
    // Migrate Messages
    console.log('Migrating Messages...');
    for (const message of MOCK_MESSAGES) {
        try {
             // Convert date strings to Firestore Timestamps
            const messageData = {
                ...message,
                timestamp: Timestamp.fromDate(new Date(message.timestamp)),
            };
            await addDoc(collection(db, 'messages'), messageData);
            console.log(`Added message from senderId: ${message.senderId}`);
        } catch (e) {
            console.error("Error adding message: ", e);
        }
    }

    console.log('Data migration completed!');
};

migrateData();
