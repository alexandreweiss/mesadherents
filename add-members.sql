-- Quick SQL script to manually add members to the database
-- Run this in your PostgreSQL database if needed

-- Add some sample members
INSERT INTO "User" (id, name, email, role, balance, "isActive", "createdAt", "updatedAt")
VALUES 
    ('member1', 'Jean Dupont', 'jean.dupont@email.com', 'MEMBER', 0, true, NOW(), NOW()),
    ('member2', 'Marie Martin', 'marie.martin@email.com', 'MEMBER', 10.50, true, NOW(), NOW()),
    ('member3', 'Pierre Durand', 'pierre.durand@email.com', 'MEMBER', -5.25, true, NOW(), NOW());

-- To check existing users:
-- SELECT name, email, role, balance FROM "User";