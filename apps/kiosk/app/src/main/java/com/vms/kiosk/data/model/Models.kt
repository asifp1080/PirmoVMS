package com.vms.kiosk.data.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class KioskConfig(
    val id: String,
    val name: String,
    val locationId: String,
    val organizationId: String,
    val ui: UiConfig,
    val hardware: HardwareConfig,
    val security: SecurityConfig,
    val notifications: NotificationConfig
) : Parcelable

@Parcelize
data class UiConfig(
    val theme: String = "light",
    val logoUrl: String? = null,
    val backgroundImageUrl: String? = null,
    val welcomeMessage: String? = null,
    val languageOptions: List<String> = listOf("en"),
    val showCompanyField: Boolean = true,
    val showPhoneField: Boolean = true,
    val requirePhoto: Boolean = true,
    val requireSignature: Boolean = false
) : Parcelable

@Parcelize
data class HardwareConfig(
    val cameraEnabled: Boolean = true,
    val printerEnabled: Boolean = false,
    val scannerEnabled: Boolean = false,
    val printerConfig: PrinterConfig? = null
) : Parcelable

@Parcelize
data class PrinterConfig(
    val printerType: String = "thermal",
    val paperSize: String = "4x6",
    val printLogo: Boolean = true
) : Parcelable

@Parcelize
data class SecurityConfig(
    val sessionTimeoutMinutes: Int = 30,
    val maxFailedAttempts: Int = 3,
    val requireHostApproval: Boolean = false,
    val allowedPurposes: List<String> = listOf("MEETING", "INTERVIEW", "DELIVERY", "GUEST", "OTHER")
) : Parcelable

@Parcelize
data class NotificationConfig(
    val hostNotificationEnabled: Boolean = true,
    val visitorConfirmationEnabled: Boolean = true,
    val notificationDelaySeconds: Int = 0
) : Parcelable

enum class VisitPurpose(val displayName: String) {
    MEETING("Meeting"),
    INTERVIEW("Interview"),
    DELIVERY("Delivery"),
    GUEST("Guest Visit"),
    OTHER("Other")
}

@Parcelize
data class Language(
    val code: String,
    val name: String,
    val nativeName: String
) : Parcelable

@Parcelize
data class Host(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val department: String? = null,
    val avatarUrl: String? = null
) : Parcelable {
    val name: String get() = "$firstName $lastName"
}

@Parcelize
data class Agreement(
    val id: String,
    val name: String,
    val content: String,
    val isRequired: Boolean,
    val type: String
) : Parcelable

@Parcelize
data class Visit(
    val id: String? = null,
    val visitorId: String? = null,
    val locationId: String,
    val hostId: String? = null,
    val purpose: VisitPurpose,
    val firstName: String,
    val lastName: String,
    val company: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val photoUri: String? = null,
    val badgeNumber: String? = null,
    val qrCode: String? = null,
    val checkInTime: Long? = null,
    val checkOutTime: Long? = null,
    val status: VisitStatus = VisitStatus.PENDING,
    val signedAgreements: List<String> = emptyList(),
    val metadata: Map<String, String> = emptyMap()
) : Parcelable

enum class VisitStatus {
    PENDING,
    CHECKED_IN,
    CHECKED_OUT,
    NO_SHOW
}

@Parcelize
data class Visitor(
    val id: String? = null,
    val firstName: String,
    val lastName: String,
    val company: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val photoUri: String? = null,
    val preferredLanguage: String = "en",
    val marketingOptIn: Boolean = false
) : Parcelable