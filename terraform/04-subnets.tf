resource "aws_subnet" "private_zone1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "20.0.0.0/20"
  availability_zone = local.zone1

  tags = {
    "Name" = "${local.env}-private-${local.zone1}"
    # Used to deploy private load balancers
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "private_zone2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "20.0.16.0/20"
  availability_zone = local.zone2

  tags = {
    "Name" = "${local.env}-private-${local.zone2}"
    # Used to deploy private load balancers
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "public_zone1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "20.0.128.0/20"
  availability_zone = local.zone1
  # Assign public ip to instances automatically
  map_public_ip_on_launch = true

  tags = {
    "Name" = "${local.env}-public-${local.zone1}"
    # Used to deploy public load balancers
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "public_zone2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "20.0.144.0/20"
  availability_zone = local.zone2
  # Assign public ip to instances automatically
  map_public_ip_on_launch = true

  tags = {
    "Name" = "${local.env}-public-${local.zone2}"
    # Used to deploy public load balancers
    "kubernetes.io/role/elb" = "1"
  }
}
