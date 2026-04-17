-- Create tables for the Fishing database
-- Target: Azure SQL Database (jiechencnsqlserver.database.windows.net / fishing)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'species')
BEGIN
    CREATE TABLE species (
        [type]        NVARCHAR(450)  NOT NULL,
        [description] NVARCHAR(MAX)  NOT NULL DEFAULT '',
        CONSTRAINT PK_species PRIMARY KEY ([type])
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'activities')
BEGIN
    CREATE TABLE activities (
        id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [datetime]  DATETIME2      NOT NULL,
        fishtype  NVARCHAR(450)  NOT NULL,
        location  NVARCHAR(MAX)  NOT NULL DEFAULT '',
        locationname NVARCHAR(MAX) NOT NULL DEFAULT '',
        weather   NVARCHAR(MAX)  NOT NULL DEFAULT '',
        fishinfo  NVARCHAR(MAX)  NOT NULL DEFAULT '',
        skill     NVARCHAR(MAX)  NOT NULL DEFAULT '',
        locationmap NVARCHAR(MAX) NOT NULL DEFAULT '',
        imagelink NVARCHAR(MAX)  NOT NULL DEFAULT '',
        videolink NVARCHAR(MAX)  NOT NULL DEFAULT '',
        CONSTRAINT PK_activities PRIMARY KEY (id),
        CONSTRAINT FK_activities_species FOREIGN KEY (fishtype) REFERENCES species([type])
    );
END
GO
