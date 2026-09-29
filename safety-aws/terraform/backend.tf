terraform {
  backend "s3" {
    bucket       = "clothsy-safety-tfstate-251929332238"
    key          = "safety-aws/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
