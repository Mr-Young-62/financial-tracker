package com.financialtracker.server

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import kotlin.time.Duration.Companion.seconds

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    // 1. Content Negotiation (JSON)
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }

    // 2. CORS configuration for web & cross-platform clients
    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Patch)
        allowHeader(HttpHeaders.Authorization)
        allowHeader(HttpHeaders.ContentType)
        allowHeader("Idempotency-Key")
        anyHost() // In production, lock down to authorized client origins
    }

    // 3. Call Logging & Diagnostics
    install(CallLogging)

    // 4. Rate Limiting (Prevent brute force & abuse)
    install(RateLimit) {
        register(RateLimitName("auth-limit")) {
            rateLimiter(limit = 10, refillPeriod = 60.seconds)
        }
        register(RateLimitName("api-limit")) {
            rateLimiter(limit = 100, refillPeriod = 60.seconds)
        }
    }

    // 5. Global Exception / Status Handling
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respond(
                HttpStatusCode.InternalServerError,
                mapOf("status" to "error", "message" to (cause.message ?: "Internal Server Error"))
            )
        }
        status(HttpStatusCode.Unauthorized) { call, _ ->
            call.respond(
                HttpStatusCode.Unauthorized,
                mapOf("status" to "error", "message" to "Invalid or expired JWT token")
            )
        }
    }

    // 6. Security & JWT Setup
    val jwtSecret = environment.config.propertyOrNull("jwt.secret")?.getString() ?: "financial_tracker_jwt_super_secret_key_2026_xyz"
    val jwtIssuer = environment.config.propertyOrNull("jwt.issuer")?.getString() ?: "financial-tracker-backend"
    val jwtAudience = environment.config.propertyOrNull("jwt.audience")?.getString() ?: "financial-tracker-clients"

    install(Authentication) {
        jwt("auth-jwt") {
            realm = "Financial Tracker Services"
            verifier(
                com.auth0.jwt.JWT
                    .require(com.auth0.jwt.algorithms.Algorithm.HMAC256(jwtSecret))
                    .withAudience(jwtAudience)
                    .withIssuer(jwtIssuer)
                    .build()
            )
            validate { credential ->
                if (credential.payload.getClaim("userId").asString() != "") {
                    JWTPrincipal(credential.payload)
                } else {
                    null
                }
            }
        }
    }

    // 7. Health check & Routing
    routing {
        get("/health") {
            call.respond(HttpStatusCode.OK, mapOf("status" to "UP", "service" to "financial-tracker-server"))
        }

        route("/api/v1") {
            // Unprotected auth routes
            route("/auth") {
                rateLimit(RateLimitName("auth-limit")) {
                    post("/register") {
                        call.respond(HttpStatusCode.Created, mapOf("status" to "success", "message" to "User registered successfully"))
                    }
                    post("/login") {
                        call.respond(HttpStatusCode.OK, mapOf("status" to "success", "token" to "mock_jwt_token"))
                    }
                    post("/refresh") {
                        call.respond(HttpStatusCode.OK, mapOf("status" to "success", "token" to "refreshed_jwt_token"))
                    }
                }
            }

            // Protected financial ledger routes
            authenticate("auth-jwt") {
                rateLimit(RateLimitName("api-limit")) {
                    route("/dashboard") {
                        get("/summary") {
                            call.respond(HttpStatusCode.OK, mapOf("status" to "success"))
                        }
                    }
                    route("/transactions") {
                        get {
                            call.respond(HttpStatusCode.OK, emptyList<String>())
                        }
                        post {
                            call.respond(HttpStatusCode.Created, mapOf("status" to "created"))
                        }
                    }
                    route("/accounts") {
                        get { call.respond(HttpStatusCode.OK, emptyList<String>()) }
                        post { call.respond(HttpStatusCode.Created, mapOf("status" to "created")) }
                    }
                    route("/budgets") {
                        get { call.respond(HttpStatusCode.OK, emptyList<String>()) }
                        post { call.respond(HttpStatusCode.Created, mapOf("status" to "created")) }
                    }
                }
            }
        }
    }
}
