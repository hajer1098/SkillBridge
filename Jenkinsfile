pipeline {
    agent { label 'docker' }
    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        skipDefaultCheckout(true)
    }
    parameters {
        string(name: 'DEPLOY_BRANCH', defaultValue: 'main', description: 'Trusted branch allowed to publish and deploy.')
        booleanParam(name: 'PUBLISH_IMAGES', defaultValue: false, description: 'Enable after configuring registry-credentials and REGISTRY_PREFIX.')
        booleanParam(name: 'DEPLOY_TO_VPS', defaultValue: false, description: 'Enable after configuring VPS credentials and the server .env file.')
        string(name: 'REGISTRY_PREFIX', defaultValue: '', description: 'For example ghcr.io/your-github-account/skillbridge (lowercase).')
        string(name: 'VPS_HOST', defaultValue: '', description: 'VPS DNS hostname or IPv4 address.')
        string(name: 'VPS_USER', defaultValue: '', description: 'SSH deployment user.')
        string(name: 'VPS_PORT', defaultValue: '22', description: 'SSH port.')
        string(name: 'VPS_DIRECTORY', defaultValue: '/opt/skillbridge', description: 'Existing deployment directory owned by the SSH user.')
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() + "-${env.BUILD_NUMBER}"
                    env.CI_PROJECT = "skillbridge-ci-${env.JOB_NAME.hashCode().toString().replace('-', 'n')}-${env.BUILD_NUMBER}"
                    env.SOURCE_BRANCH = env.BRANCH_NAME ?: sh(script: 'git branch --show-current', returnStdout: true).trim()
                    if (params.DEPLOY_TO_VPS && !params.PUBLISH_IMAGES) {
                        error('DEPLOY_TO_VPS requires PUBLISH_IMAGES so the VPS can pull this tested release.')
                    }
                }
                sh 'for script in SkillBridge-backend/scripts/*.sh SkillBridge-backend/tests/*.sh SkillBridge-backend/deploy/deploy-vps.sh; do bash -n "$script"; done'
                sh 'bash SkillBridge-backend/scripts/ci-docker.sh prepare'
            }
        }
        stage('Build Docker images') {
            steps { sh 'bash SkillBridge-backend/scripts/ci-docker.sh build' }
        }
        stage('Integration and proxy tests') {
            steps { sh 'bash SkillBridge-backend/scripts/ci-docker.sh test' }
        }
        stage('Publish tested images') {
            when { expression { params.PUBLISH_IMAGES && !env.CHANGE_ID && env.SOURCE_BRANCH == params.DEPLOY_BRANCH } }
            steps {
                withEnv(["REGISTRY_PREFIX=${params.REGISTRY_PREFIX}"]) {
                    withCredentials([usernamePassword(credentialsId: 'registry-credentials', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASSWORD')]) {
                        sh 'bash SkillBridge-backend/scripts/publish-images.sh'
                    }
                }
                archiveArtifacts artifacts: 'SkillBridge-backend/.local/release/*', fingerprint: true
            }
        }
        stage('Deploy to VPS') {
            when { expression { params.DEPLOY_TO_VPS && !env.CHANGE_ID && env.SOURCE_BRANCH == params.DEPLOY_BRANCH } }
            steps {
                withEnv(["VPS_HOST=${params.VPS_HOST}", "VPS_USER=${params.VPS_USER}", "VPS_PORT=${params.VPS_PORT}", "VPS_DIRECTORY=${params.VPS_DIRECTORY}"]) {
                    withCredentials([file(credentialsId: 'vps-known-hosts', variable: 'KNOWN_HOSTS_FILE')]) {
                        sshagent(credentials: ['vps-ssh-key']) {
                            sh 'bash SkillBridge-backend/scripts/send-release.sh'
                        }
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
