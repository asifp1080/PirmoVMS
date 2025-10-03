package com.vms.kiosk.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vms.kiosk.data.model.*
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.ui.components.*
import com.vms.kiosk.ui.viewmodel.CheckInViewModel
import kotlinx.coroutines.delay

@Composable
fun CheckInFlowScreen(
    repository: KioskRepository,
    onComplete: (Visit) -> Unit,
    onCancel: () -> Unit,
    viewModel: CheckInViewModel = viewModel { CheckInViewModel(repository) }
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Handle submission result
    LaunchedEffect(uiState.submissionResult) {
        uiState.submissionResult?.let { result ->
            result.fold(
                onSuccess = { visit ->
                    delay(1000) // Show success briefly
                    onComplete(visit)
                },
                onFailure = { error ->
                    // Error is handled in UI state
                }
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            // Progress indicator
            LinearProgressIndicator(
                progress = (uiState.currentStep.toFloat() / 6f),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            )

            Text(
                text = "Step ${uiState.currentStep} of 6",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Step content
            when (uiState.currentStep) {
                1 -> LanguageSelectionStep(
                    selectedLanguage = uiState.selectedLanguage,
                    onLanguageSelected = viewModel::selectLanguage,
                    onNext = viewModel::nextStep
                )
                2 -> PurposeSelectionStep(
                    selectedPurpose = uiState.selectedPurpose,
                    onPurposeSelected = viewModel::selectPurpose,
                    onNext = viewModel::nextStep,
                    onBack = viewModel::previousStep
                )
                3 -> VisitorDetailsStep(
                    visitorDetails = uiState.visitorDetails,
                    onDetailsChanged = viewModel::updateVisitorDetails,
                    onNext = viewModel::nextStep,
                    onBack = viewModel::previousStep
                )
                4 -> HostSelectionStep(
                    hosts = uiState.hosts,
                    selectedHost = uiState.selectedHost,
                    onHostSelected = viewModel::selectHost,
                    onNext = viewModel::nextStep,
                    onBack = viewModel::previousStep,
                    isLoading = uiState.isLoadingHosts
                )
                5 -> PhotoCaptureStep(
                    photoUri = uiState.photoUri,
                    onPhotoTaken = viewModel::setPhoto,
                    onNext = viewModel::nextStep,
                    onBack = viewModel::previousStep
                )
                6 -> ReviewStep(
                    visitorDetails = uiState.visitorDetails,
                    selectedPurpose = uiState.selectedPurpose,
                    selectedHost = uiState.selectedHost,
                    photoUri = uiState.photoUri,
                    onSubmit = viewModel::submitVisit,
                    onBack = viewModel::previousStep,
                    isSubmitting = uiState.isSubmitting
                )
            }
        }

        // Cancel button
        IconButton(
            onClick = { viewModel.showCancelDialog() },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Cancel",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }
    }

    // Error Dialog
    ErrorDialog(
        title = "Check-in Failed",
        message = uiState.errorMessage ?: "An unexpected error occurred",
        onRetry = {
            viewModel.clearError()
            viewModel.submitVisit()
        },
        onCancel = {
            viewModel.clearError()
        },
        isVisible = uiState.errorMessage != null
    )

    // Success Dialog
    SuccessDialog(
        title = "Check-in Successful!",
        message = uiState.successMessage ?: "Your visit has been registered",
        onDismiss = {
            viewModel.clearSuccess()
        },
        isVisible = uiState.successMessage != null
    )

    // Cancel Confirmation Dialog
    ConfirmationDialog(
        title = "Cancel Check-in?",
        message = "Are you sure you want to cancel? All entered information will be lost.",
        confirmText = "Yes, Cancel",
        cancelText = "Continue",
        onConfirm = onCancel,
        onCancel = viewModel::hideCancelDialog,
        isVisible = uiState.showCancelDialog
    )

    // Loading Dialog
    LoadingDialog(
        message = "Submitting your check-in...",
        isVisible = uiState.isSubmitting
    )

    // Offline Queue Dialog
    if (uiState.isOfflineQueued) {
        SuccessDialog(
            title = "Queued for Sync",
            message = "Your check-in has been saved and will be synced when connection is restored.",
            onDismiss = {
                viewModel.clearOfflineQueue()
                // Still call onComplete with the queued visit
                uiState.queuedVisit?.let { onComplete(it) }
            },
            isVisible = true
        )
    }
}

@Composable
private fun LanguageSelectionStep(
    selectedLanguage: String?,
    onLanguageSelected: (String) -> Unit,
    onNext: () -> Unit
) {
    Column {
        Text(
            text = "Select Your Language",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        val languages = listOf(
            "English" to "en",
            "Español" to "es",
            "Français" to "fr",
            "Deutsch" to "de",
            "中文" to "zh"
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(languages) { (name, code) ->
                Card(
                    onClick = { onLanguageSelected(code) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedLanguage == code) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surface
                        }
                    )
                ) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(24.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onNext,
            enabled = selectedLanguage != null,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Next")
        }
    }
}

@Composable
private fun PurposeSelectionStep(
    selectedPurpose: VisitPurpose?,
    onPurposeSelected: (VisitPurpose) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column {
        Text(
            text = "What's the purpose of your visit?",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        val purposes = listOf(
            VisitPurpose.MEETING to "Meeting",
            VisitPurpose.INTERVIEW to "Interview",
            VisitPurpose.DELIVERY to "Delivery",
            VisitPurpose.GUEST to "Guest Visit",
            VisitPurpose.OTHER to "Other"
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(purposes) { (purpose, name) ->
                Card(
                    onClick = { onPurposeSelected(purpose) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedPurpose == purpose) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surface
                        }
                    )
                ) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(24.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }

            Spacer(modifier = Modifier.width(16.dp))

            Button(
                onClick = onNext,
                enabled = selectedPurpose != null,
                modifier = Modifier.weight(1f)
            ) {
                Text("Next")
            }
        }
    }
}

@Composable
private fun VisitorDetailsStep(
    visitorDetails: VisitorDetails,
    onDetailsChanged: (VisitorDetails) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column {
        Text(
            text = "Please provide your details",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                OutlinedTextField(
                    value = visitorDetails.firstName,
                    onValueChange = { onDetailsChanged(visitorDetails.copy(firstName = it)) },
                    label = { Text("First Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            item {
                OutlinedTextField(
                    value = visitorDetails.lastName,
                    onValueChange = { onDetailsChanged(visitorDetails.copy(lastName = it)) },
                    label = { Text("Last Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            item {
                OutlinedTextField(
                    value = visitorDetails.email,
                    onValueChange = { onDetailsChanged(visitorDetails.copy(email = it)) },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            item {
                OutlinedTextField(
                    value = visitorDetails.phone,
                    onValueChange = { onDetailsChanged(visitorDetails.copy(phone = it)) },
                    label = { Text("Phone") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            item {
                OutlinedTextField(
                    value = visitorDetails.company,
                    onValueChange = { onDetailsChanged(visitorDetails.copy(company = it)) },
                    label = { Text("Company") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }

            Spacer(modifier = Modifier.width(16.dp))

            Button(
                onClick = onNext,
                enabled = visitorDetails.firstName.isNotBlank() && visitorDetails.lastName.isNotBlank(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Next")
            }
        }
    }
}

@Composable
private fun HostSelectionStep(
    hosts: List<Host>,
    selectedHost: Host?,
    onHostSelected: (Host) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean
) {
    Column {
        Text(
            text = "Who are you visiting?",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(hosts) { host ->
                    Card(
                        onClick = { onHostSelected(host) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selectedHost?.id == host.id) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.surface
                            }
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Host avatar placeholder
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(
                                        MaterialTheme.colorScheme.primary,
                                        CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${host.firstName.first()}${host.lastName.first()}",
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Spacer(modifier = Modifier.width(16.dp))

                            Column {
                                Text(
                                    text = "${host.firstName} ${host.lastName}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = host.department,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }

            Spacer(modifier = Modifier.width(16.dp))

            Button(
                onClick = onNext,
                enabled = selectedHost != null,
                modifier = Modifier.weight(1f)
            ) {
                Text("Next")
            }
        }
    }
}

@Composable
private fun PhotoCaptureStep(
    photoUri: String?,
    onPhotoTaken: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column {
        Text(
            text = "Take a photo",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            if (photoUri != null) {
                // Show captured photo
                Text("Photo captured successfully!")
            } else {
                // Camera preview placeholder
                Card(
                    modifier = Modifier
                        .size(300.dp)
                        .clickable { 
                            // Simulate photo capture
                            onPhotoTaken("mock_photo_uri")
                        },
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "Camera",
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Tap to take photo")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }

            Spacer(modifier = Modifier.width(16.dp))

            OutlinedButton(
                onClick = onNext,
                modifier = Modifier.weight(1f)
            ) {
                Text("Skip Photo")
            }

            if (photoUri != null) {
                Spacer(modifier = Modifier.width(16.dp))
                
                Button(
                    onClick = onNext,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Next")
                }
            }
        }
    }
}

@Composable
private fun ReviewStep(
    visitorDetails: VisitorDetails,
    selectedPurpose: VisitPurpose?,
    selectedHost: Host?,
    photoUri: String?,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    isSubmitting: Boolean
) {
    Column {
        Text(
            text = "Review your information",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                ReviewItem("Name", "${visitorDetails.firstName} ${visitorDetails.lastName}")
            }
            
            if (visitorDetails.email.isNotBlank()) {
                item {
                    ReviewItem("Email", visitorDetails.email)
                }
            }
            
            if (visitorDetails.phone.isNotBlank()) {
                item {
                    ReviewItem("Phone", visitorDetails.phone)
                }
            }
            
            if (visitorDetails.company.isNotBlank()) {
                item {
                    ReviewItem("Company", visitorDetails.company)
                }
            }
            
            item {
                ReviewItem("Purpose", selectedPurpose?.name ?: "")
            }
            
            item {
                ReviewItem("Host", selectedHost?.let { "${it.firstName} ${it.lastName}" } ?: "")
            }
            
            if (photoUri != null) {
                item {
                    ReviewItem("Photo", "Photo captured")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                onClick = onBack,
                enabled = !isSubmitting,
                modifier = Modifier.weight(1f)
            ) {
                Text("Back")
            }

            Spacer(modifier = Modifier.width(16.dp))

            Button(
                onClick = onSubmit,
                enabled = !isSubmitting,
                modifier = Modifier.weight(1f)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Submit")
                }
            }
        }
    }
}

@Composable
private fun ReviewItem(
    label: String,
    value: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
        }
    }
}