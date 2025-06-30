'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      /* 1. drop the enum-typed default */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status" DROP DEFAULT;`,
        { transaction }
      );

      /* 2. cast the column from enum to varchar */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status"
         TYPE VARCHAR(50)
         USING "status"::TEXT;`,
        { transaction }
      );

      /* 3. remap old values to the new vocabulary */
      await queryInterface.sequelize.query(
        `UPDATE "Leads"
           SET "status" = CASE
                 WHEN "status" = 'new'         THEN 'lead'
                 WHEN "status" = 'in_progress' THEN 'opportunity'
                 WHEN "status" = 'converted'   THEN 'done'
                 WHEN "status" = 'lost'        THEN 'lost'
                 ELSE 'lead'
              END;`,
        { transaction }
      );

      /* 4. set the new (string) default */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status" SET DEFAULT 'lead';`,
        { transaction }
      );

      /* 5. with nothing depending on it any more, drop the enum type */
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_Leads_status";`,
        { transaction }
      );

      /* 6. add the new column */
      await queryInterface.addColumn(
        'Leads',
        'parked',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      /* 1. remove the parked column */
      await queryInterface.removeColumn('Leads', 'parked', { transaction });

      /* 2. (re-)create the enum type if it doesn’t already exist */
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
             CREATE TYPE "enum_Leads_status"
               AS ENUM ('new','in_progress','converted','lost');
           EXCEPTION WHEN duplicate_object THEN NULL;
         END $$;`,
        { transaction }
      );

      /* 3. drop the text default */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status" DROP DEFAULT;`,
        { transaction }
      );

      /* 4. cast the column back to the enum, translating the
            string values to enum values on the way */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status"
         TYPE "enum_Leads_status"
         USING CASE
                 WHEN "status" = 'lead'        THEN 'new'::"enum_Leads_status"
                 WHEN "status" = 'opportunity' THEN 'in_progress'::"enum_Leads_status"
                 WHEN "status" = 'project'     THEN 'in_progress'::"enum_Leads_status"
                 WHEN "status" = 'done'        THEN 'converted'::"enum_Leads_status"
                 ELSE 'lost'::"enum_Leads_status"
               END;`,
        { transaction }
      );

      /* 5. restore the old default */
      await queryInterface.sequelize.query(
        `ALTER TABLE "Leads"
         ALTER COLUMN "status" SET DEFAULT 'new';`,
        { transaction }
      );
    });
  },
};
