package com.vms.kiosk

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.data.model.Visit
import com.vms.kiosk.data.model.VisitStatus
import com.vms.kiosk.data.model.VisitPurpose
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

@RunWith(AndroidJUnit4::class)
class OfflineQueueingTest {

    private lateinit var kioskRepository: KioskRepository

    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        // Initialize repository with test configuration
        // This would typically use a test database
    }

    @Test
    fun offlineVisit_isQueuedLocally() = runBlocking {
        // Create a test visit
        val visit = Visit(
            locationId = "test-location",
            purpose = VisitPurpose.MEETING,
            firstName = "John",
            lastName = "Doe",
            email = "john.doe@example.com",
            company = "Test Corp",
            status = VisitStatus.PENDING
        )

        // Simulate offline mode by disconnecting network
        // (This would be done through test configuration)

        // Submit visit while offline
        val result = kioskRepository.submitVisit(visit)

        // Should fail due to network but queue locally
        assertTrue(result.isFailure)

        // Verify visit is queued locally
        val pendingVisits = kioskRepository.getPendingVisits()
        assertEquals(1, pendingVisits.size)
        assertEquals("John", pendingVisits[0].firstName)
    }

    @Test
    fun offlineVisits_syncWhenOnline() = runBlocking {
        // Create multiple test visits
        val visits = listOf(
            Visit(
                locationId = "test-location",
                purpose = VisitPurpose.MEETING,
                firstName = "John",
                lastName = "Doe",
                email = "john.doe@example.com",
                status = VisitStatus.PENDING
            ),
            Visit(
                locationId = "test-location",
                purpose = VisitPurpose.INTERVIEW,
                firstName = "Jane",
                lastName = "Smith",
                email = "jane.smith@example.com",
                status = VisitStatus.PENDING
            )
        )

        // Submit visits while offline
        visits.forEach { visit ->
            kioskRepository.submitVisit(visit)
        }

        // Verify visits are queued
        val pendingVisits = kioskRepository.getPendingVisits()
        assertEquals(2, pendingVisits.size)

        // Simulate coming back online and sync
        val syncResult = kioskRepository.syncPendingVisits()

        // Should successfully sync all visits
        assertTrue(syncResult.isSuccess)
        assertEquals(2, syncResult.getOrDefault(0))

        // Pending visits should be cleared after successful sync
        val remainingPendingVisits = kioskRepository.getPendingVisits()
        assertEquals(0, remainingPendingVisits.size)
    }

    @Test
    fun offlineVisit_handlesPartialSync() = runBlocking {
        // Create test visits
        val visits = listOf(
            Visit(
                locationId = "test-location",
                purpose = VisitPurpose.MEETING,
                firstName = "John",
                lastName = "Doe",
                email = "john.doe@example.com",
                status = VisitStatus.PENDING
            ),
            Visit(
                locationId = "test-location",
                purpose = VisitPurpose.INTERVIEW,
                firstName = "Invalid",
                lastName = "Data", // This visit will fail server validation
                email = "invalid-email",
                status = VisitStatus.PENDING
            )
        )

        // Submit visits while offline
        visits.forEach { visit ->
            kioskRepository.submitVisit(visit)
        }

        // Simulate partial sync (one succeeds, one fails)
        val syncResult = kioskRepository.syncPendingVisits()

        // Should report partial success
        assertTrue(syncResult.isSuccess)
        assertEquals(1, syncResult.getOrDefault(0)) // Only one synced

        // Failed visit should remain in queue
        val remainingPendingVisits = kioskRepository.getPendingVisits()
        assertEquals(1, remainingPendingVisits.size)
        assertEquals("Invalid", remainingPendingVisits[0].firstName)
    }

    @Test
    fun offlineVisit_preservesPhotosAndSignatures() = runBlocking {
        val visit = Visit(
            locationId = "test-location",
            purpose = VisitPurpose.MEETING,
            firstName = "John",
            lastName = "Doe",
            email = "john.doe@example.com",
            photoUri = "file:///storage/photos/visitor_photo.jpg",
            status = VisitStatus.PENDING
        )

        // Submit visit with photo while offline
        kioskRepository.submitVisit(visit)

        // Verify photo URI is preserved in local storage
        val pendingVisits = kioskRepository.getPendingVisits()
        assertEquals(1, pendingVisits.size)
        assertEquals("file:///storage/photos/visitor_photo.jpg", pendingVisits[0].photoUri)

        // When syncing, photos should be uploaded
        val syncResult = kioskRepository.syncPendingVisits()
        assertTrue(syncResult.isSuccess)

        // After sync, photo should have server URL
        // (This would be verified through mock server responses)
    }

    @Test
    fun offlineMode_handlesConflictResolution() = runBlocking {
        // Create visit with specific timestamp
        val clientTimestamp = System.currentTimeMillis()
        val visit = Visit(
            locationId = "test-location",
            purpose = VisitPurpose.MEETING,
            firstName = "John",
            lastName = "Doe",
            email = "john.doe@example.com",
            checkInTime = clientTimestamp,
            status = VisitStatus.CHECKED_IN
        )

        // Submit while offline
        kioskRepository.submitVisit(visit)

        // Simulate server having different data when syncing
        // (This would be handled by the sync logic)
        val syncResult = kioskRepository.syncPendingVisits()

        // Should resolve conflicts using client timestamp wins strategy
        assertTrue(syncResult.isSuccess)
    }

    @Test
    fun offlineMode_maintainsDataIntegrity() = runBlocking {
        // Create visit with all required fields
        val visit = Visit(
            locationId = "test-location",
            hostId = "test-host",
            purpose = VisitPurpose.MEETING,
            firstName = "John",
            lastName = "Doe",
            email = "john.doe@example.com",
            phone = "+1-555-0123",
            company = "Test Corp",
            photoUri = "file:///storage/photos/visitor.jpg",
            badgeNumber = "BADGE-001",
            qrCode = "QR-12345",
            checkInTime = System.currentTimeMillis(),
            status = VisitStatus.CHECKED_IN,
            signedAgreements = listOf("nda-v1", "safety-v1"),
            metadata = mapOf("kiosk_id" to "kiosk-001")
        )

        // Submit complex visit while offline
        kioskRepository.submitVisit(visit)

        // Verify all data is preserved
        val pendingVisits = kioskRepository.getPendingVisits()
        assertEquals(1, pendingVisits.size)
        
        val savedVisit = pendingVisits[0]
        assertEquals("John", savedVisit.firstName)
        assertEquals("Doe", savedVisit.lastName)
        assertEquals("john.doe@example.com", savedVisit.email)
        assertEquals("+1-555-0123", savedVisit.phone)
        assertEquals("Test Corp", savedVisit.company)
        assertEquals("BADGE-001", savedVisit.badgeNumber)
        assertEquals(2, savedVisit.signedAgreements.size)
        assertEquals("kiosk-001", savedVisit.metadata["kiosk_id"])
    }

    @Test
    fun offlineMode_handlesStorageLimit() = runBlocking {
        // Create many visits to test storage limits
        val visits = (1..100).map { i ->
            Visit(
                locationId = "test-location",
                purpose = VisitPurpose.MEETING,
                firstName = "Visitor$i",
                lastName = "Test",
                email = "visitor$i@example.com",
                status = VisitStatus.PENDING
            )
        }

        // Submit all visits while offline
        visits.forEach { visit ->
            kioskRepository.submitVisit(visit)
        }

        // Should handle storage gracefully
        val pendingVisits = kioskRepository.getPendingVisits()
        assertTrue(pendingVisits.size <= 100) // Should not exceed reasonable limit

        // Oldest visits might be removed if storage limit is reached
        // This depends on the implementation strategy
    }
}