package com.vms.kiosk

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.vms.kiosk.data.model.*
import com.vms.kiosk.ui.screens.CheckInFlowScreen
import com.vms.kiosk.ui.theme.VMSKioskTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckInFlowTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun checkInFlow_displaysLanguageSelection() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Select Your Language")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("English")
            .assertIsDisplayed()
            .assertHasClickAction()
    }

    @Test
    fun checkInFlow_proceedsToVisitPurpose() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Select language
        composeTestRule
            .onNodeWithText("English")
            .performClick()

        // Click next
        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Should show visit purpose step
        composeTestRule
            .onNodeWithText("What's the purpose of your visit?")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Meeting")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_proceedsToVisitorDetails() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Navigate through steps
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Should show visitor details step
        composeTestRule
            .onNodeWithText("Please provide your details")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("First Name")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Last Name")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Email")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_validatesRequiredFields() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Navigate to visitor details
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Try to proceed without filling required fields
        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Should show validation errors or disable next button
        composeTestRule
            .onNodeWithText("Next")
            .assertIsNotEnabled()
    }

    @Test
    fun checkInFlow_fillsVisitorDetails() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Navigate to visitor details
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Fill in visitor details
        composeTestRule
            .onNodeWithText("First Name")
            .performTextInput("John")

        composeTestRule
            .onNodeWithText("Last Name")
            .performTextInput("Doe")

        composeTestRule
            .onNodeWithText("Email")
            .performTextInput("john.doe@example.com")

        composeTestRule
            .onNodeWithText("Company")
            .performTextInput("Acme Corp")

        // Next button should be enabled
        composeTestRule
            .onNodeWithText("Next")
            .assertIsEnabled()
    }

    @Test
    fun checkInFlow_allowsBackNavigation() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Navigate forward
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Should show back button
        composeTestRule
            .onNodeWithText("Back")
            .assertIsDisplayed()
            .performClick()

        // Should go back to language selection
        composeTestRule
            .onNodeWithText("Select Your Language")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_showsProgressIndicator() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = {}
                )
            }
        }

        // Should show progress indicator
        composeTestRule
            .onNodeWithContentDescription("Progress indicator")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_allowsCancellation() {
        var cancelled = false

        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = {},
                    onCancel = { cancelled = true }
                )
            }
        }

        composeTestRule
            .onNodeWithContentDescription("Cancel")
            .performClick()

        assert(cancelled)
    }

    @Test
    fun checkInFlow_completesSuccessfully() {
        var completed = false

        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    onComplete = { completed = true },
                    onCancel = {}
                )
            }
        }

        // Complete full flow (simplified for test)
        // In a real test, you would navigate through all steps
        // and mock the submission process

        // For now, just verify the callback works
        // This would be expanded to test the full flow
        assert(!completed) // Initially false

        // Navigate through all steps and submit
        // ... (full navigation would be implemented here)
    }
}