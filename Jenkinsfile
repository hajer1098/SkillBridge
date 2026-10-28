pipeline {
    agent any
    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        skipDefaultCheckout(true)
    }
    parameters {
        string(name: 'DEPLOY_BRANCH', defaultValue: 'main', description: 'Trusted branch allowed to transfer images and deploy.')
        booleanParam(name: 'DEPLOY_TO_VPS', defaultValue: false, description: 'Enable after configuring VPS credentials and the server .env file.')
        string(name: 'VPS_HOST', defaultValue: '51.210.107.84', description: 'VPS DNS hostname or IPv4 address.')
        string(name: 'VPS_USER', defaultValue: 'hajer', description: 'SSH deployment user.')
        string(name: 'VPS_PORT', defaultValue: '2244', description: 'SSH port.')
        string(name: 'VPS_DIRECTORY', defaultValue: '/home/hajer/skillbridge', description: 'Existing deployment directory owned by the SSH user.')
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() + "-${env.BUILD_NUMBER}"
                    env.CI_PROJECT = "skillbridge-ci-${env.JOB_NAME.hashCode().toString().replace('-', 'n')}-${env.BUILD_NUMBER}"
                    env.SOURCE_BRANCH = env.BRANCH_NAME ?: sh(script: 'git branch --show-current', returnStdout: true).trim()
                }
                sh 'for script in SkillBridge-backend/scripts/*.sh SkillBridge-backend/tests/*.sh SkillBridge-backend/deploy/deploy-vps.sh; do bash -n "$script"; done'
                sh 'bash SkillBridge-backend/tests/ci-image-tags.test.sh'
                sh 'bash SkillBridge-backend/scripts/ci-docker.sh prepare'
            }
        }
        stage('Build Docker images') {
            steps { sh 'bash SkillBridge-backend/scripts/ci-docker.sh build' }
        }
        stage('Tests') {
            steps { sh 'bash SkillBridge-backend/scripts/ci-docker.sh test' }
        }
        stage('Transfer to VPS') {
            when { expression { params.DEPLOY_TO_VPS && !env.CHANGE_ID && env.SOURCE_BRANCH == params.DEPLOY_BRANCH } }
            steps {
                sh 'bash SkillBridge-backend/scripts/package-images.sh'
                withEnv(["VPS_HOST=${params.VPS_HOST}", "VPS_USER=${params.VPS_USER}", "VPS_PORT=${params.VPS_PORT}", "VPS_DIRECTORY=${params.VPS_DIRECTORY}", "KNOWN_HOSTS_FILE=${env.WORKSPACE}/SkillBridge-backend/deploy/vps-known-hosts"]) {
                    withCredentials([sshUserPrivateKey(credentialsId: 'vps-ssh-key', keyFileVariable: 'SSH_KEY_FILE')]) {
                        sh 'bash SkillBridge-backend/scripts/send-release.sh upload'
                    }
                }
                archiveArtifacts artifacts: "SkillBridge-backend/.local/direct-release/${env.IMAGE_TAG}/images.env,SkillBridge-backend/.local/direct-release/${env.IMAGE_TAG}/images.sha256,SkillBridge-backend/.local/direct-release/${env.IMAGE_TAG}/release.txt", fingerprint: true
            }
        }
        stage('Deploy with Compose') {
            when { expression { params.DEPLOY_TO_VPS && !env.CHANGE_ID && env.SOURCE_BRANCH == params.DEPLOY_BRANCH } }
            steps {
                withEnv(["VPS_HOST=${params.VPS_HOST}", "VPS_USER=${params.VPS_USER}", "VPS_PORT=${params.VPS_PORT}", "VPS_DIRECTORY=${params.VPS_DIRECTORY}", "KNOWN_HOSTS_FILE=${env.WORKSPACE}/SkillBridge-backend/deploy/vps-known-hosts"]) {
                    withCredentials([sshUserPrivateKey(credentialsId: 'vps-ssh-key', keyFileVariable: 'SSH_KEY_FILE')]) {
                        sh 'bash SkillBridge-backend/scripts/send-release.sh deploy'
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                if (env.CI_PROJECT && env.IMAGE_TAG) {
                    sh 'bash SkillBridge-backend/scripts/ci-docker.sh cleanup'
                }
            }
        }
    }
}
