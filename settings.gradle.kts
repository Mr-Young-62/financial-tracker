rootProject.name = "financial-tracker"

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.pkg.jetbrains.space/public/p/compose/dev")
    }
}

include(":server")
include(":system:shared")
include(":system:composeApp")
include(":system:core:network")
include(":system:core:database")
include(":system:core:common")
include(":system:core:design")
include(":system:feature:authentication")
include(":system:feature:dashboard")
include(":system:feature:transactions")
include(":system:feature:budgets")
include(":system:feature:categories")
include(":system:feature:accounts")
include(":system:feature:reports")
include(":system:feature:recurring")
include(":system:feature:settings")
include(":system:androidApp")
include(":system:desktopApp")
