package com.vms.kiosk.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vms.kiosk.R
import com.vms.kiosk.data.model.VisitPurpose
import com.vms.kiosk.ui.components.*

@Composable
fun CheckInFlowScreen(
    onComplete: () -> Unit,
    onCancel: () -> Unit,
    viewModel: CheckInFlowViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.visitor_check_in),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold
                )
                
                IconButton(onClick = onCancel) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = stringResource(R.string.cancel),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }

        item {
            // Progress indicator
            CheckInProgressIndicator(
                currentStep = uiState.currentStep,
                totalSteps = uiState.totalSteps
            )
        }

        item {
            when (uiState.currentStep) {
                1 -> LanguageSelectionStep(
                    selectedLanguage = uiState.selectedLanguage,
                    availableLanguages = uiState.availableLanguages,
                    onLanguageSelected = viewModel::selectLanguage
                )
                
                2 -> VisitPurposeStep(
                    selectedPurpose = uiState.visitPurpose,
                    onPurposeSelected = viewModel::selectVisitPurpose
                )
                
                3 -> VisitorDetailsStep(
                    firstName = uiState.firstName,
                    lastName = uiState.lastName,
                    company = uiState.company,
                    email = uiState.email,
                    phone = uiState.phone,
                    onFirstNameChanged = viewModel::updateFirstName,
                    onLastNameChanged = viewModel::updateLastName,
                    onCompanyChanged = viewModel::updateCompany,
                    onEmailChanged = viewModel::updateEmail,
                    onPhoneChanged = viewModel::updatePhone
                )
                
                4 -> HostSelectionStep(
                    selectedHost = uiState.selectedHost,
                    availableHosts = uiState.availableHosts,
                    onHostSelected = viewModel::selectHost
                )
                
                5 -> PhotoCaptureStep(
                    capturedPhotoUri = uiState.capturedPhotoUri,
                    onPhotoCaptured = viewModel::capturePhoto,
                    onRetakePhoto = viewModel::retakePhoto
                )
                
                6 -> AgreementsStep(
                    agreements = uiState.agreements,
                    signedAgreements = uiState.signedAgreements,
                    onAgreementSigned = viewModel::signAgreement
                )
                
                7 -> ReviewStep(
                    firstName = uiState.firstName,
                    lastName = uiState.lastName,
                    company = uiState.company,
                    email = uiState.email,
                    phone = uiState.phone,
                    visitPurpose = uiState.visitPurpose,
                    selectedHost = uiState.selectedHost,
                    capturedPhotoUri = uiState.capturedPhotoUri
                )
                
                8 -> SuccessStep(
                    badgeNumber = uiState.badgeNumber,
                    qrCode = uiState.qrCode,
                    hostName = uiState.selectedHost?.name ?: ""
                )
            }
        }

        item {
            // Navigation buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (uiState.currentStep > 1 && uiState.currentStep < 8) {
                    OutlinedButton(
                        onClick = viewModel::previousStep,
                        modifier = Modifier.size(width = 120.dp, height = 56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.back))
                    }
                } else {
                    Spacer(modifier = Modifier.width(120.dp))
                }

                when (uiState.currentStep) {
                    8 -> {
                        Button(
                            onClick = onComplete,
                            modifier = Modifier.size(width = 160.dp, height = 56.dp)
                        ) {
                            Text(stringResource(R.string.finish))
                        }
                    }
                    7 -> {
                        Button(
                            onClick = viewModel::submitCheckIn,
                            enabled = !uiState.isSubmitting,
                            modifier = Modifier.size(width = 160.dp, height = 56.dp)
                        ) {
                            if (uiState.isSubmitting) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Text(stringResource(R.string.confirm))
                            }
                        }
                    }
                    else -> {
                        Button(
                            onClick = viewModel::nextStep,
                            enabled = viewModel.canProceedToNextStep(),
                            modifier = Modifier.size(width = 160.dp, height = 56.dp)
                        ) {
                            Text(stringResource(R.string.next))
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    // Error handling
    uiState.errorMessage?.let { error ->
        LaunchedEffect(error) {
            // Show error snackbar or dialog
        }
    }
}