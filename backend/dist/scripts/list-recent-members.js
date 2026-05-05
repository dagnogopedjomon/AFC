"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const members = await prisma.member.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            profileCompleted: true,
            createdAt: true,
        },
    });
    console.log('--- 5 derniers membres créés ---');
    console.table(members.map((m) => ({
        id: m.id,
        phone: m.phone,
        name: `${m.firstName} ${m.lastName}`,
        role: m.role,
        profileCompleted: m.profileCompleted,
        createdAt: m.createdAt.toISOString(),
    })));
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=list-recent-members.js.map